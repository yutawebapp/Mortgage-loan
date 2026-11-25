package com.example.mortgage.totalcost.domain;

import com.example.mortgage.common.RoundingPolicy;
import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import com.example.mortgage.simulation.domain.RepaymentResult;
import com.example.mortgage.simulation.domain.RepaymentResult.ScheduleRow;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure Java total housing cost calculator (住居費の総額). No Spring / DB dependencies.
 *
 * <p>Rules:
 * <ol>
 *   <li>closingCost = RoundingPolicy(propertyPrice x closingCostRatePercent / 100). Informational only.</li>
 *   <li>loanPrincipal = propertyPrice + closingCost - downPayment; must be &gt; 0.</li>
 *   <li>The loan schedule is produced by {@link RepaymentCalculator} (no bonus payments).</li>
 *   <li>ownershipCost per year = (monthlyManagementFee + monthlyRepairReserve) x 12 + annualPropertyTax
 *       + annualInsurance. Constant every year; not rounded (all inputs are whole yen).</li>
 *   <li>yearTotal = loanPayment + ownershipCost; cumulativeOutlay = initialCost + running sum of yearTotal.</li>
 *   <li>initialCost = downPayment (cash outlay at the start). closingCost is NOT added here: closing costs
 *       are paid out of the same total budget as the price (downPayment + loan = propertyPrice + closingCost,
 *       the same assumption as /budget). loanPrincipal already finances them, so adding closingCost to the
 *       outlay would count it twice. See {@link TotalCostNote#CLOSING_COSTS_FINANCED_FROM_BUDGET}.</li>
 *   <li>grandTotal = downPayment + totalLoanPayment + totalOwnershipCost.</li>
 *   <li>monthlyAverage = RoundingPolicy(grandTotal / (years x 12)).</li>
 * </ol>
 * Not modelled (see {@link TotalCostNote}): resale value, costs after the loan term, tax deduction.
 */
public final class TotalCostCalculator {

    private static final MathContext MC = new MathContext(60, RoundingMode.HALF_EVEN);
    private static final BigDecimal PERCENT = BigDecimal.valueOf(100);
    private static final int MONTHS_PER_YEAR = 12;
    private static final BigDecimal MONTHS = BigDecimal.valueOf(MONTHS_PER_YEAR);

    private TotalCostCalculator() {
    }

    /**
     * @param propertyPrice          property price in yen (&gt;= 1)
     * @param downPayment            down payment in yen (&gt;= 0)
     * @param closingCostRatePercent closing costs in percent of property price (&gt;= 0)
     * @param annualRatePercent      annual rate in percent, e.g. 1.2 means 1.2% (&gt;= 0)
     * @param years                  loan term in years (&gt;= 1)
     * @param method                 repayment method
     * @param monthlyManagementFee   management fee per month in yen (&gt;= 0)
     * @param monthlyRepairReserve   repair reserve per month in yen (&gt;= 0)
     * @param annualPropertyTax      fixed asset tax + city planning tax per year in yen (&gt;= 0)
     * @param annualInsurance        fire / earthquake insurance per year in yen, annualized (&gt;= 0)
     * @throws IllegalArgumentException when loanPrincipal is not positive
     */
    public static TotalCostResult calculate(BigDecimal propertyPrice,
                                            BigDecimal downPayment,
                                            BigDecimal closingCostRatePercent,
                                            BigDecimal annualRatePercent,
                                            int years,
                                            RepaymentMethod method,
                                            BigDecimal monthlyManagementFee,
                                            BigDecimal monthlyRepairReserve,
                                            BigDecimal annualPropertyTax,
                                            BigDecimal annualInsurance) {
        BigDecimal closingCost = closingCost(propertyPrice, closingCostRatePercent);
        BigDecimal principal = loanPrincipal(propertyPrice, downPayment, closingCost);
        if (principal.signum() <= 0) {
            throw new IllegalArgumentException("loan principal must be positive");
        }
        BigDecimal initialCost = downPayment;
        BigDecimal ownershipYearly = monthlyManagementFee.add(monthlyRepairReserve).multiply(MONTHS)
                .add(annualPropertyTax)
                .add(annualInsurance);

        RepaymentResult repayment = RepaymentCalculator.calculate(principal, annualRatePercent, years,
                method, BigDecimal.ZERO);
        List<ScheduleRow> schedule = repayment.schedule();

        List<TotalCostResult.YearRow> rows = new ArrayList<>(years);
        BigDecimal totalLoanPayment = BigDecimal.ZERO;
        BigDecimal totalInterest = BigDecimal.ZERO;
        BigDecimal cumulative = initialCost;
        for (int year = 1; year <= years; year++) {
            int from = (year - 1) * MONTHS_PER_YEAR;
            int to = year * MONTHS_PER_YEAR;
            BigDecimal loanPayment = BigDecimal.ZERO;
            BigDecimal interest = BigDecimal.ZERO;
            BigDecimal principalPaid = BigDecimal.ZERO;
            for (int i = from; i < to; i++) {
                ScheduleRow row = schedule.get(i);
                loanPayment = loanPayment.add(row.payment());
                interest = interest.add(row.interest());
                principalPaid = principalPaid.add(row.principal());
            }
            BigDecimal yearEndBalance = schedule.get(to - 1).balance();
            BigDecimal yearTotal = loanPayment.add(ownershipYearly);
            cumulative = cumulative.add(yearTotal);
            totalLoanPayment = totalLoanPayment.add(loanPayment);
            totalInterest = totalInterest.add(interest);
            rows.add(new TotalCostResult.YearRow(year, loanPayment, interest, principalPaid,
                    yearEndBalance, ownershipYearly, yearTotal, cumulative));
        }

        BigDecimal totalOwnership = ownershipYearly.multiply(BigDecimal.valueOf(years));
        BigDecimal grandTotal = downPayment.add(totalLoanPayment).add(totalOwnership);
        BigDecimal monthlyAverage = RoundingPolicy.yen(
                grandTotal.divide(BigDecimal.valueOf((long) years * MONTHS_PER_YEAR), MC));

        return new TotalCostResult(
                downPayment,
                closingCost,
                initialCost,
                principal,
                totalLoanPayment,
                totalInterest,
                totalOwnership,
                grandTotal,
                monthlyAverage,
                schedule.get(0).payment(),
                List.copyOf(rows),
                List.of(TotalCostNote.values()));
    }

    /** Closing costs = RoundingPolicy(propertyPrice x rate / 100). */
    public static BigDecimal closingCost(BigDecimal propertyPrice, BigDecimal closingCostRatePercent) {
        return RoundingPolicy.yen(propertyPrice.multiply(closingCostRatePercent).divide(PERCENT, MC));
    }

    /** propertyPrice + closingCost - downPayment (may be &lt;= 0; caller checks). */
    public static BigDecimal loanPrincipal(BigDecimal propertyPrice, BigDecimal downPayment, BigDecimal closingCost) {
        return propertyPrice.add(closingCost).subtract(downPayment);
    }
}
