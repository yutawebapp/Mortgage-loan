package com.example.mortgage.ratescenario.domain;

import com.example.mortgage.simulation.domain.RepaymentMethod;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Expected values below were computed independently with python3 exact arithmetic (fractions):
 * monthly rate = annual/12, payment and interest rounded HALF_UP to yen, final month clears the balance,
 * stage 2 re-amortizes the balance at month riseAfterYears*12 over the remaining months at start+rise.
 * They were NOT produced by this code.
 */
class RateRiseCalculatorTest {

    private static RateRiseComparison calc(String principal, String startPct, int years,
                                           RepaymentMethod method, int riseAfter, String... rises) {
        return RateRiseCalculator.compare(new BigDecimal(principal), new BigDecimal(startPct), years, method,
                riseAfter, Arrays.stream(rises).map(BigDecimal::new).toList());
    }

    private static long l(BigDecimal v) {
        return v.longValueExact();
    }

    @Test
    void equalPayment_30M_05percent_35y_riseAt5y_plus1_matchesReference() {
        RateRiseComparison r = calc("30000000", "0.5", 35, RepaymentMethod.EQUAL_PAYMENT, 5, "1.0");

        RateRiseScenario base = r.baseline();
        assertThat(l(base.monthlyPaymentBefore())).isEqualTo(77_876L);
        assertThat(l(base.monthlyPaymentAfter())).isEqualTo(77_876L);
        assertThat(l(base.totalPayment())).isEqualTo(32_707_747L);
        assertThat(l(base.totalInterest())).isEqualTo(2_707_747L);
        assertThat(l(base.extraInterestVsBaseline())).isZero();

        RateRiseScenario s = r.scenarios().get(0);
        assertThat(s.risePoints()).isEqualByComparingTo("1.0");
        assertThat(s.rateAfterPercent()).isEqualByComparingTo("1.5");
        assertThat(l(s.monthlyPaymentBefore())).isEqualTo(77_876L);
        assertThat(l(s.monthlyPaymentAfter())).isEqualTo(89_831L);
        assertThat(l(s.monthlyPaymentIncrease())).isEqualTo(11_955L);
        assertThat(l(s.monthlyPaymentDifferenceVsBaseline())).isEqualTo(11_955L);
        assertThat(l(base.monthlyPaymentDifferenceVsBaseline())).isZero();
        assertThat(l(s.totalPayment())).isEqualTo(37_011_608L);
        assertThat(l(s.totalInterest())).isEqualTo(7_011_608L);
        assertThat(l(s.extraInterestVsBaseline())).isEqualTo(4_303_861L);
        assertThat(s.monthlyPayments()).hasSize(35 * 12);
    }

    @Test
    void equalPayment_multipleRises_extraInterestIncreasesWithRise() {
        RateRiseComparison r = calc("30000000", "0.5", 35, RepaymentMethod.EQUAL_PAYMENT, 5, "0.5", "1.0", "2.0");

        assertThat(r.scenarios()).hasSize(3);
        assertThat(r.scenarios().stream().map(s -> l(s.monthlyPaymentAfter())).toList())
                .containsExactly(83_719L, 89_831L, 102_845L);
        assertThat(r.scenarios().stream().map(s -> l(s.extraInterestVsBaseline())).toList())
                .containsExactly(2_103_661L, 4_303_861L, 8_989_209L);
        assertThat(r.scenarios().get(0).extraInterestVsBaseline())
                .isLessThan(r.scenarios().get(1).extraInterestVsBaseline());
        assertThat(r.scenarios().get(1).extraInterestVsBaseline())
                .isLessThan(r.scenarios().get(2).extraInterestVsBaseline());
    }

    @Test
    void paymentsBeforeRise_equalBaseline_andLengthIsYearsTimes12() {
        RateRiseComparison r = calc("30000000", "0.5", 35, RepaymentMethod.EQUAL_PAYMENT, 5, "1.0");
        RateRiseScenario s = r.scenarios().get(0);

        assertThat(s.monthlyPayments().subList(0, 60))
                .isEqualTo(r.baseline().monthlyPayments().subList(0, 60));
        assertThat(s.monthlyPayments()).hasSize(420);
        assertThat(r.baseline().monthlyPayments()).hasSize(420);
        assertThat(l(s.totalPayment())).isEqualTo(
                s.monthlyPayments().stream().mapToLong(BigDecimal::longValueExact).sum());
    }

    @Test
    void zeroPercentStart_riseAt10y_plus1_matchesReference() {
        RateRiseComparison r = calc("30000000", "0", 35, RepaymentMethod.EQUAL_PAYMENT, 10, "1.0");

        assertThat(l(r.baseline().monthlyPaymentBefore())).isEqualTo(71_429L);
        assertThat(l(r.baseline().totalPayment())).isEqualTo(30_000_000L);
        assertThat(l(r.baseline().totalInterest())).isZero();

        RateRiseScenario s = r.scenarios().get(0);
        assertThat(l(s.monthlyPaymentBefore())).isEqualTo(71_429L);
        assertThat(l(s.monthlyPaymentAfter())).isEqualTo(80_758L);
        assertThat(l(s.monthlyPaymentIncrease())).isEqualTo(9_329L);
        assertThat(l(s.totalPayment())).isEqualTo(32_798_948L);
        assertThat(l(s.totalInterest())).isEqualTo(2_798_948L);
        assertThat(l(s.extraInterestVsBaseline())).isEqualTo(2_798_948L);
    }

    @Test
    void equalPrincipal_30M_05percent_35y_riseAt5y_plus1_matchesReference() {
        RateRiseComparison r = calc("30000000", "0.5", 35, RepaymentMethod.EQUAL_PRINCIPAL, 5, "1.0");

        assertThat(l(r.baseline().monthlyPaymentBefore())).isEqualTo(82_173L);
        assertThat(l(r.baseline().monthlyPayments().get(0))).isEqualTo(83_929L);
        assertThat(l(r.baseline().totalPayment())).isEqualTo(32_631_241L);
        assertThat(l(r.baseline().totalInterest())).isEqualTo(2_631_241L);

        RateRiseScenario s = r.scenarios().get(0);
        assertThat(l(s.monthlyPaymentBefore())).isEqualTo(82_173L);
        assertThat(l(s.monthlyPaymentAfter())).isEqualTo(103_572L);
        assertThat(l(s.monthlyPaymentIncrease())).isEqualTo(21_399L);
        assertThat(l(r.baseline().monthlyPaymentAfter())).isEqualTo(82_143L);
        assertThat(l(r.baseline().monthlyPaymentIncrease())).isEqualTo(-30L);
        assertThat(l(r.baseline().monthlyPaymentDifferenceVsBaseline())).isZero();
        assertThat(l(s.monthlyPaymentDifferenceVsBaseline())).isEqualTo(21_429L);
        assertThat(l(s.totalPayment())).isEqualTo(36_499_081L);
        assertThat(l(s.totalInterest())).isEqualTo(6_499_081L);
        assertThat(l(s.extraInterestVsBaseline())).isEqualTo(3_867_840L);
        assertThat(s.monthlyPayments()).hasSize(420);
    }

    @Test
    void equalPrincipalSmallRiseCanLowerPaymentBetweenMonthsWhileExceedingBaseline() {
        // Independent Decimal HALF_UP: month 60 = 82,173, month 61 baseline = 82,143,
        // month 61 at 0.501% = 82,165.
        RateRiseScenario s = calc("30000000", "0.5", 35, RepaymentMethod.EQUAL_PRINCIPAL, 5, "0.001")
                .scenarios().get(0);
        assertThat(l(s.monthlyPaymentBefore())).isEqualTo(82_173L);
        assertThat(l(s.monthlyPaymentAfter())).isEqualTo(82_165L);
        assertThat(l(s.monthlyPaymentIncrease())).isEqualTo(-8L);
        assertThat(l(s.monthlyPaymentDifferenceVsBaseline())).isEqualTo(22L);
    }

    @Test
    void riseAfterYearsOutOfRange_throws() {
        assertThatThrown(0, 35);
        assertThatThrown(35, 35);
    }

    private static void assertThatThrown(int riseAfter, int years) {
        assertThatThrownBy(() ->
                        RateRiseCalculator.compare(new BigDecimal("30000000"), new BigDecimal("0.5"), years,
                                RepaymentMethod.EQUAL_PAYMENT, riseAfter, List.of(new BigDecimal("1.0"))))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
