package com.example.mortgage.refinance.domain;

import com.example.mortgage.refinance.domain.RefinanceComparison.CumulativeSaving;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Expected values were computed independently with python3 (Decimal, prec 80, closed-form PMT,
 * ROUND_HALF_UP to whole yen per payment/interest, final month clears the balance), NOT with this code.
 */
class RefinanceComparatorTest {

    private static RefinanceComparison compare(String balance, String curRate, int curYears,
                                               String newRate, int newYears, String costs) {
        return RefinanceComparator.compare(new BigDecimal(balance), new BigDecimal(curRate), curYears,
                new BigDecimal(newRate), newYears, RepaymentMethod.EQUAL_PAYMENT, new BigDecimal(costs));
    }

    private static long l(BigDecimal v) {
        return v.longValueExact();
    }

    @Test
    void mainCase_25M_2pct_to_0p8pct_25y_costs500k_matchesReference() {
        RefinanceComparison r = compare("25000000", "2.0", 25, "0.8", 25, "500000");

        assertThat(l(r.current().monthlyPayment())).isEqualTo(105_964L);
        assertThat(l(r.current().totalPayment())).isEqualTo(31_789_034L);
        assertThat(l(r.current().totalInterest())).isEqualTo(6_789_034L);
        assertThat(l(r.refinanced().monthlyPayment())).isEqualTo(91_972L);
        assertThat(l(r.refinanced().totalPayment())).isEqualTo(27_591_574L);
        assertThat(l(r.refinanced().totalInterest())).isEqualTo(2_591_574L);
        assertThat(l(r.monthlySaving())).isEqualTo(13_992L);
        assertThat(l(r.totalSaving())).isEqualTo(3_697_460L);
        assertThat(r.breakEvenMonth()).isEqualTo(36);
    }

    @Test
    void mainCase_netSeriesValuesAroundBreakEven() {
        RefinanceComparison r = compare("25000000", "2.0", 25, "0.8", 25, "500000");

        assertThat(l(r.cumulativeSaving().get(0).net())).isEqualTo(-486_008L);
        assertThat(l(r.cumulativeSaving().get(1).net())).isEqualTo(-472_016L);
        assertThat(l(r.cumulativeSaving().get(34).net())).isEqualTo(-10_280L);
        assertThat(l(r.cumulativeSaving().get(35).net())).isEqualTo(3_712L);
    }

    @Test
    void invariants_seriesLengthLastNetAndBreakEvenConsistent() {
        RefinanceComparison r = compare("25000000", "2.0", 25, "0.8", 25, "500000");

        List<CumulativeSaving> s = r.cumulativeSaving();
        assertThat(s).hasSize(25 * 12);
        assertThat(s.get(0).month()).isEqualTo(1);
        assertThat(s.get(s.size() - 1).month()).isEqualTo(s.size());
        assertThat(l(s.get(s.size() - 1).net())).isEqualTo(l(r.totalSaving()));

        Integer be = r.breakEvenMonth();
        assertThat(be).isNotNull();
        assertThat(l(s.get(be - 1).net())).isNotNegative();
        for (int m = 1; m < be; m++) {
            assertThat(l(s.get(m - 1).net())).as("month %d", m).isNegative();
        }
    }

    @Test
    void newRateHigher_neverBreaksEven_breakEvenNull() {
        RefinanceComparison r = compare("25000000", "1.0", 25, "1.5", 25, "500000");

        assertThat(r.breakEvenMonth()).isNull();
        assertThat(l(r.monthlySaving())).isEqualTo(-5_766L);
        assertThat(l(r.totalSaving())).isEqualTo(-2_229_797L);
        assertThat(r.cumulativeSaving()).allSatisfy(c -> assertThat(l(c.net())).isNegative());
    }

    @Test
    void zeroCostsAndLowerRate_breakEvenIsMonthOne() {
        RefinanceComparison r = compare("25000000", "2.0", 25, "0.8", 25, "0");

        assertThat(r.breakEvenMonth()).isEqualTo(1);
        assertThat(l(r.totalSaving())).isEqualTo(4_197_460L);
        assertThat(l(r.cumulativeSaving().get(0).net())).isPositive();
    }

    @Test
    void differentTerms_horizonIsMaxOfYears_andPaymentsStopAfterLoanEnds() {
        RefinanceComparison r = compare("25000000", "2.0", 25, "0.8", 35, "500000");

        assertThat(r.cumulativeSaving()).hasSize(35 * 12);
        assertThat(r.breakEvenMonth()).isEqualTo(14);
        assertThat(l(r.monthlySaving())).isEqualTo(37_699L);
        assertThat(l(r.totalSaving())).isEqualTo(2_617_622L);
        assertThat(l(r.cumulativeSaving().get(35 * 12 - 1).net())).isEqualTo(2_617_622L);
    }

    @Test
    void temporaryCashFlowAdvantageDoesNotMeanFinalSaving() {
        // Independently: 100,000 vs 50,000 yen/month; costs 750,000 yen.
        RefinanceComparison r = compare("12000000", "0", 10, "0", 20, "750000");
        assertThat(r.breakEvenMonth()).isEqualTo(15);
        assertThat(l(r.cumulativeSaving().get(13).net())).isEqualTo(-50_000L);
        assertThat(l(r.cumulativeSaving().get(14).net())).isZero();
        assertThat(l(r.cumulativeSaving().get(119).net())).isEqualTo(5_250_000L);
        assertThat(l(r.cumulativeSaving().get(239).net())).isEqualTo(-750_000L);
        assertThat(l(r.totalSaving())).isEqualTo(-750_000L);
    }

    @Test
    void costsAreNotAddedToNewLoanPrincipal() {
        RefinanceComparison without = compare("25000000", "2.0", 25, "0.8", 25, "0");
        RefinanceComparison with = compare("25000000", "2.0", 25, "0.8", 25, "500000");

        assertThat(l(with.refinanced().totalPayment())).isEqualTo(l(without.refinanced().totalPayment()));
        assertThat(l(with.monthlySaving())).isEqualTo(l(without.monthlySaving()));
        assertThat(l(without.totalSaving()) - l(with.totalSaving())).isEqualTo(500_000L);
    }
}
