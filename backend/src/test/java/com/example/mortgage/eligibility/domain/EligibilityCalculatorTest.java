package com.example.mortgage.eligibility.domain;

import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Expected values were computed independently with python3 using exact rational arithmetic
 * (fractions.Fraction; P = M*(1-(1+r)^-n)/r rounded DOWN to 10,000; payment = P*r/(1-(1+r)^-n) rounded
 * HALF_UP to yen), NOT with this code.
 */
class EligibilityCalculatorTest {

    private static EligibilityResult calc(String income, String other, String screening, String actual, int years) {
        return EligibilityCalculator.calculate(new BigDecimal(income), new BigDecimal(other),
                new BigDecimal(screening), new BigDecimal(actual), years);
    }

    private static long l(BigDecimal v) {
        return v.longValueExact();
    }

    @Test
    void income6M_limit35_actual1pct_35y() {
        EligibilityResult r = calc("6000000", "0", "3.5", "1.0", 35);

        assertThat(r.burdenRatioLimitPercent()).isEqualTo(35);
        assertThat(l(r.maxAnnualRepayment())).isEqualTo(2_100_000L);
        assertThat(l(r.availableAnnualRepayment())).isEqualTo(2_100_000L);
        assertThat(l(r.availableMonthlyRepayment())).isEqualTo(175_000L);

        assertThat(l(r.atScreeningRate().maxPrincipal())).isEqualTo(42_340_000L);
        assertThat(l(r.atScreeningRate().monthlyPayment())).isEqualTo(174_987L);
        assertThat(l(r.atActualRate().maxPrincipal())).isEqualTo(61_990_000L);
        assertThat(l(r.atActualRate().monthlyPayment())).isEqualTo(174_989L);
    }

    @Test
    void incomeBelow4M_limit30() {
        EligibilityResult r = calc("3500000", "0", "3.5", "1.0", 35);

        assertThat(r.burdenRatioLimitPercent()).isEqualTo(30);
        assertThat(l(r.maxAnnualRepayment())).isEqualTo(1_050_000L);
        assertThat(l(r.availableMonthlyRepayment())).isEqualTo(87_500L);
        assertThat(l(r.atScreeningRate().maxPrincipal())).isEqualTo(21_170_000L);
        assertThat(l(r.atScreeningRate().monthlyPayment())).isEqualTo(87_494L);
        assertThat(l(r.atActualRate().maxPrincipal())).isEqualTo(30_990_000L);
        assertThat(l(r.atActualRate().monthlyPayment())).isEqualTo(87_480L);
    }

    @Test
    void incomeExactly4M_limit35() {
        EligibilityResult r = calc("4000000", "0", "3.5", "1.0", 35);

        assertThat(r.burdenRatioLimitPercent()).isEqualTo(35);
        assertThat(l(r.maxAnnualRepayment())).isEqualTo(1_400_000L);
        assertThat(l(r.availableMonthlyRepayment())).isEqualTo(116_666L); // 116,666.67 rounded down
        assertThat(l(r.atScreeningRate().maxPrincipal())).isEqualTo(28_220_000L);
        assertThat(l(r.atScreeningRate().monthlyPayment())).isEqualTo(116_631L);
        assertThat(l(r.atActualRate().maxPrincipal())).isEqualTo(41_320_000L);
        assertThat(l(r.atActualRate().monthlyPayment())).isEqualTo(116_640L);
    }

    @Test
    void otherRepaymentsExceedLimit_allAvailableZero() {
        EligibilityResult r = calc("6000000", "2500000", "3.5", "1.0", 35);

        assertThat(l(r.maxAnnualRepayment())).isEqualTo(2_100_000L);
        assertThat(l(r.availableAnnualRepayment())).isZero();
        assertThat(l(r.availableMonthlyRepayment())).isZero();
        assertThat(l(r.atScreeningRate().maxPrincipal())).isZero();
        assertThat(l(r.atScreeningRate().monthlyPayment())).isZero();
        assertThat(l(r.atActualRate().maxPrincipal())).isZero();
        assertThat(l(r.atActualRate().monthlyPayment())).isZero();
    }

    @Test
    void otherRepaymentsPartlyReduceBudget() {
        EligibilityResult r = calc("6000000", "600000", "3.5", "2.0", 25);

        assertThat(l(r.availableAnnualRepayment())).isEqualTo(1_500_000L);
        assertThat(l(r.availableMonthlyRepayment())).isEqualTo(125_000L);
        assertThat(l(r.atScreeningRate().maxPrincipal())).isEqualTo(24_960_000L);
        assertThat(l(r.atScreeningRate().monthlyPayment())).isEqualTo(124_956L);
        assertThat(l(r.atActualRate().maxPrincipal())).isEqualTo(29_490_000L);
        assertThat(l(r.atActualRate().monthlyPayment())).isEqualTo(124_995L);
    }

    @Test
    void zeroRate_isMonthlyBudgetTimesMonths() {
        EligibilityResult r = calc("6000000", "0", "3.5", "0", 35);

        assertThat(l(r.atActualRate().maxPrincipal())).isEqualTo(73_500_000L); // 175,000 x 420
        assertThat(l(r.atActualRate().monthlyPayment())).isEqualTo(175_000L);
    }

    @ParameterizedTest
    @CsvSource({
            "6000000, 0, 3.5, 1.0, 35",
            "3500000, 0, 3.5, 1.0, 35",
            "4000000, 0, 3.5, 1.0, 35",
            "2400000, 0, 3.5, 0.5, 20",
            "6000000, 600000, 3.5, 2.0, 25",
            "12345678, 333333, 4.25, 7.9, 50",
            "900000000, 0, 20, 20, 1",
            "1, 0, 0, 0, 1",
            "5000000, 5000000, 0, 0, 1"
    })
    void invariant_monthlyPaymentWithinBudget(String income, String other, String screening, String actual, int years) {
        EligibilityResult r = calc(income, other, screening, actual, years);
        long budget = l(r.availableMonthlyRepayment());

        for (EligibilityResult.Estimate e : new EligibilityResult.Estimate[]{r.atScreeningRate(), r.atActualRate()}) {
            assertThat(l(e.monthlyPayment())).isGreaterThanOrEqualTo(0L).isLessThanOrEqualTo(budget);
            assertThat(l(e.maxPrincipal())).isGreaterThanOrEqualTo(0L);
            assertThat(l(e.maxPrincipal()) % 10_000L).isZero();
        }
    }

    @Test
    void maxPrincipal_paymentOfMaxPrincipalMatchesRepaymentCalculator() {
        EligibilityResult r = calc("6000000", "0", "3.5", "1.0", 35);
        BigDecimal p = r.atActualRate().maxPrincipal();
        BigDecimal payment = RepaymentCalculator.calculate(p, new BigDecimal("1.0"), 35,
                RepaymentMethod.EQUAL_PAYMENT, BigDecimal.ZERO).monthlyPayment();

        assertThat(payment).isEqualTo(r.atActualRate().monthlyPayment());
    }
}
