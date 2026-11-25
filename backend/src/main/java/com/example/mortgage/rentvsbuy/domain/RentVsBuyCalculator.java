package com.example.mortgage.rentvsbuy.domain;

import com.example.mortgage.common.RoundingPolicy;
import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import com.example.mortgage.simulation.domain.RepaymentResult.ScheduleRow;
import com.example.mortgage.totalcost.domain.TotalCostCalculator;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure Java rent-vs-buy comparison (賃貸と購入の比較). No Spring / DB dependencies.
 * Shows cumulative spending side by side; it never decides which option is better.
 *
 * <p>Rules (all user assumptions; no legal or tax figures):
 * <ol>
 *   <li>closingCost = {@link TotalCostCalculator#closingCost}; loanPrincipal = price + closing - down; must be &gt; 0.
 *       Closing costs are financed from the same budget (not added to the cash outlay again).</li>
 *   <li>Loan schedule from {@link RepaymentCalculator} (no bonus). Year k covers payments 12(k-1)+1 .. 12k;
 *       0 after the loan term; loanBalance = balance after payment min(12k, n).</li>
 *   <li>ownershipCost per year = (managementFee + repairReserve) x 12 + propertyTax + insurance, every year
 *       (including after the loan term).</li>
 *   <li>purchaseYearOutlay = loanPayment + ownershipCost; purchaseCumulative = downPayment + running sum.</li>
 *   <li>assetValue_k = RoundingPolicy(price x (1 + a)^k), a = assetChangeRatePercent / 100 (exact power).</li>
 *   <li>netAsset_k = RoundingPolicy(assetValue_k x (1 - s)) - loanBalance_k, s = saleCostRatePercent / 100.</li>
 *   <li>purchaseNetCost_k = purchaseCumulative_k - netAsset_k (can be negative).</li>
 *   <li>monthlyRent_k = RoundingPolicy(monthlyRent x (1 + g)^(k-1)), g = rentGrowthPercent / 100.</li>
 *   <li>renewalFee_k = RoundingPolicy(renewalFeeMonths x monthlyRent_k) when k &gt; 1 and (k-1) is a multiple of
 *       renewalIntervalYears; else 0.</li>
 *   <li>rentYearOutlay_k = 12 x monthlyRent_k + renewalFee_k; rentCumulative_k = rentInitialCost + running sum.</li>
 *   <li>Crossover: first k with purchaseCumulative_k &lt;= rentCumulative_k (crossoverYearCumulative), and first k
 *       with purchaseNetCost_k &lt;= rentCumulative_k (crossoverYearNet). Null when not within the horizon.</li>
 *   <li>Sensitivity: the whole comparison recomputed with a - {@link #SENSITIVITY_OFFSET_PERCENT}, a, and
 *       a + {@link #SENSITIVITY_OFFSET_PERCENT} as the asset change rate. Not limited to -10..10 (that limit is
 *       for the request only).</li>
 * </ol>
 */
public final class RentVsBuyCalculator {

    /** Offset (percentage points) of the asset change rate used for the sensitivity entries. */
    public static final BigDecimal SENSITIVITY_OFFSET_PERCENT = new BigDecimal("2.0");

    private static final int MONTHS_PER_YEAR = 12;
    private static final BigDecimal MONTHS = BigDecimal.valueOf(MONTHS_PER_YEAR);
    private static final BigDecimal ONE = BigDecimal.ONE;

    private RentVsBuyCalculator() {
    }

    /** Inputs of the comparison; see the class documentation for the meaning of each value. */
    public record Inputs(
            BigDecimal propertyPrice,
            BigDecimal downPayment,
            BigDecimal closingCostRatePercent,
            BigDecimal annualRatePercent,
            int loanYears,
            RepaymentMethod method,
            BigDecimal monthlyManagementFee,
            BigDecimal monthlyRepairReserve,
            BigDecimal annualPropertyTax,
            BigDecimal annualInsurance,
            BigDecimal monthlyRent,
            BigDecimal rentGrowthPercent,
            BigDecimal renewalFeeMonths,
            int renewalIntervalYears,
            BigDecimal rentInitialCost,
            int horizonYears,
            BigDecimal assetChangeRatePercent,
            BigDecimal saleCostRatePercent) {
    }

    /**
     * @throws IllegalArgumentException when loanPrincipal is not positive
     */
    public static RentVsBuyResult calculate(Inputs in) {
        BigDecimal closingCost = TotalCostCalculator.closingCost(in.propertyPrice(), in.closingCostRatePercent());
        BigDecimal principal = TotalCostCalculator.loanPrincipal(in.propertyPrice(), in.downPayment(), closingCost);
        if (principal.signum() <= 0) {
            throw new IllegalArgumentException("loan principal must be positive");
        }

        Run base = run(in, in.assetChangeRatePercent(), principal);
        List<RentVsBuyResult.SensitivityRow> sensitivity = new ArrayList<>(3);
        for (BigDecimal rate : List.of(
                in.assetChangeRatePercent().subtract(SENSITIVITY_OFFSET_PERCENT),
                in.assetChangeRatePercent(),
                in.assetChangeRatePercent().add(SENSITIVITY_OFFSET_PERCENT))) {
            RentVsBuyResult.Summary s = run(in, rate, principal).summary();
            sensitivity.add(new RentVsBuyResult.SensitivityRow(rate, s.crossoverYearNet(), s.purchaseNetAtEnd()));
        }

        return new RentVsBuyResult(
                principal,
                closingCost,
                base.years(),
                base.summary(),
                List.copyOf(sensitivity),
                List.of(RentVsBuyNote.values()));
    }

    /** One full comparison for a given asset change rate. */
    private static Run run(Inputs in, BigDecimal assetChangeRatePercent, BigDecimal principal) {
        int loanMonths = in.loanYears() * MONTHS_PER_YEAR;
        List<ScheduleRow> schedule = RepaymentCalculator.calculate(principal, in.annualRatePercent(),
                in.loanYears(), in.method(), BigDecimal.ZERO).schedule();

        BigDecimal ownershipYearly = in.monthlyManagementFee().add(in.monthlyRepairReserve()).multiply(MONTHS)
                .add(in.annualPropertyTax())
                .add(in.annualInsurance());
        BigDecimal assetFactor = ONE.add(assetChangeRatePercent.movePointLeft(2));
        BigDecimal saleKeep = ONE.subtract(in.saleCostRatePercent().movePointLeft(2));
        BigDecimal rentGrowthFactor = ONE.add(in.rentGrowthPercent().movePointLeft(2));

        List<RentVsBuyResult.YearRow> rows = new ArrayList<>(in.horizonYears());
        BigDecimal purchaseCumulative = in.downPayment();
        BigDecimal rentCumulative = in.rentInitialCost();
        Integer crossoverCumulative = null;
        Integer crossoverNet = null;

        for (int year = 1; year <= in.horizonYears(); year++) {
            // Purchase side
            int from = Math.min((year - 1) * MONTHS_PER_YEAR, loanMonths);
            int to = Math.min(year * MONTHS_PER_YEAR, loanMonths);
            BigDecimal loanPayment = BigDecimal.ZERO;
            for (int i = from; i < to; i++) {
                loanPayment = loanPayment.add(schedule.get(i).payment());
            }
            BigDecimal purchaseYearOutlay = loanPayment.add(ownershipYearly);
            purchaseCumulative = purchaseCumulative.add(purchaseYearOutlay);
            // to = min(12k, n) >= 1 because n >= 12, so the schedule row exists.
            BigDecimal loanBalance = schedule.get(to - 1).balance();
            BigDecimal assetValue = RoundingPolicy.yen(in.propertyPrice().multiply(assetFactor.pow(year)));
            BigDecimal netAsset = RoundingPolicy.yen(assetValue.multiply(saleKeep)).subtract(loanBalance);
            BigDecimal purchaseNetCost = purchaseCumulative.subtract(netAsset);

            // Rent side
            BigDecimal monthlyRent = RoundingPolicy.yen(in.monthlyRent()
                    .multiply(rentGrowthFactor.pow(year - 1)));
            boolean renewal = year > 1 && (year - 1) % in.renewalIntervalYears() == 0;
            BigDecimal renewalFee = renewal
                    ? RoundingPolicy.yen(in.renewalFeeMonths().multiply(monthlyRent))
                    : BigDecimal.ZERO;
            BigDecimal rentYearOutlay = monthlyRent.multiply(MONTHS).add(renewalFee);
            rentCumulative = rentCumulative.add(rentYearOutlay);

            if (crossoverCumulative == null && purchaseCumulative.compareTo(rentCumulative) <= 0) {
                crossoverCumulative = year;
            }
            if (crossoverNet == null && purchaseNetCost.compareTo(rentCumulative) <= 0) {
                crossoverNet = year;
            }

            rows.add(new RentVsBuyResult.YearRow(year, purchaseYearOutlay, purchaseCumulative, loanBalance,
                    assetValue, purchaseNetCost, rentYearOutlay, rentCumulative));
        }

        RentVsBuyResult.YearRow last = rows.get(rows.size() - 1);
        RentVsBuyResult.Summary summary = new RentVsBuyResult.Summary(
                crossoverCumulative,
                crossoverNet,
                last.purchaseCumulative(),
                last.purchaseNetCost(),
                last.rentCumulative());
        return new Run(rows, summary);
    }

    /** Internal per-rate result used to build the public result. */
    private record Run(List<RentVsBuyResult.YearRow> years, RentVsBuyResult.Summary summary) {
    }
}
