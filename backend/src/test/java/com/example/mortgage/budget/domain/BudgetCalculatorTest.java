package com.example.mortgage.budget.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Expected values were computed independently with python3 using exact rational arithmetic
 * (fractions.Fraction): maxLoan = floor10k(M x (1-(1+r)^-n)/r), total = loan + down,
 * price = floor10k(total / (1 + c/100)), closing = HALF_UP(price x c/100),
 * payment = HALF_UP(P x r / (1-(1+r)^-n)), burden = HALF_UP1(payment x 12 / income x 100).
 * They were NOT produced by this code.
 */
class BudgetCalculatorTest {

    private static BudgetResult calc(String down, String monthly, String rate, int years,
                                     String closing, String income) {
        return BudgetCalculator.calculate(new BigDecimal(down), new BigDecimal(monthly),
                new BigDecimal(rate), years,
                closing == null ? null : new BigDecimal(closing),
                income == null ? null : new BigDecimal(income));
    }

    private static long l(BigDecimal v) {
        return v.longValueExact();
    }

    @Test
    void downPayment5M_1pct_35y_defaultClosing10() {
        BudgetResult r = calc("5000000", "100000", "1.0", 35, "10.0", null);

        assertThat(l(r.maxLoanAmount())).isEqualTo(35_420_000L);
        assertThat(l(r.totalBudget())).isEqualTo(40_420_000L);
        assertThat(l(r.maxPropertyPrice())).isEqualTo(36_740_000L);
        assertThat(l(r.closingCosts())).isEqualTo(3_674_000L);
        assertThat(l(r.monthlyPayment())).isEqualTo(99_986L);
        assertThat(r.loanExceedsPrice()).isFalse();
        assertThat(r.burdenRatioPercent()).isNull();
        assertThat(r.closingCostRatePercent()).isEqualByComparingTo("10.0");
    }

    @Test
    void zeroRate_loanIsPaymentTimesMonths() {
        BudgetResult r = calc("0", "100000", "0", 35, "10.0", null);

        assertThat(l(r.maxLoanAmount())).isEqualTo(42_000_000L);
        assertThat(l(r.totalBudget())).isEqualTo(42_000_000L);
        assertThat(l(r.maxPropertyPrice())).isEqualTo(38_180_000L);
        assertThat(l(r.closingCosts())).isEqualTo(3_818_000L);
        assertThat(l(r.monthlyPayment())).isEqualTo(100_000L);
        assertThat(r.loanExceedsPrice()).isTrue();
    }

    @Test
    void zeroClosingRate_priceEqualsTotalBudget() {
        BudgetResult r = calc("0", "100000", "1.0", 35, "0", null);

        assertThat(l(r.maxLoanAmount())).isEqualTo(35_420_000L);
        assertThat(l(r.maxPropertyPrice())).isEqualTo(35_420_000L);
        assertThat(l(r.closingCosts())).isZero();
        assertThat(r.loanExceedsPrice()).isFalse();
    }

    @Test
    void tinyDesiredPayment_loanIsZeroAndEverythingIsZero() {
        BudgetResult r = calc("0", "1", "1.0", 35, "10.0", null);

        assertThat(l(r.maxLoanAmount())).isZero();
        assertThat(l(r.totalBudget())).isZero();
        assertThat(l(r.maxPropertyPrice())).isZero();
        assertThat(l(r.closingCosts())).isZero();
        assertThat(l(r.monthlyPayment())).isZero();
        assertThat(r.loanExceedsPrice()).isFalse();
    }

    @Test
    void noDownPaymentWithClosingCosts_loanExceedsPrice() {
        BudgetResult r = calc("0", "100000", "1.0", 35, "10.0", null);

        assertThat(l(r.maxPropertyPrice())).isEqualTo(32_200_000L);
        assertThat(l(r.closingCosts())).isEqualTo(3_220_000L);
        assertThat(l(r.maxLoanAmount())).isEqualTo(35_420_000L);
        assertThat(r.loanExceedsPrice()).isTrue();
    }

    @Test
    void largeDownPayment_loanDoesNotExceedPrice() {
        BudgetResult r = calc("30000000", "100000", "1.0", 35, "10.0", null);

        assertThat(l(r.totalBudget())).isEqualTo(65_420_000L);
        assertThat(l(r.maxPropertyPrice())).isEqualTo(59_470_000L);
        assertThat(l(r.closingCosts())).isEqualTo(5_947_000L);
        assertThat(r.loanExceedsPrice()).isFalse();
    }

    @Test
    void burdenRatio_oneDecimalHalfUp_incomeGiven() {
        // 99,986 x 12 / 4,500,000 x 100 = 26.6629... -> 26.7
        BudgetResult r = calc("5000000", "100000", "1.0", 35, "10.0", "4500000");
        assertThat(r.burdenRatioPercent()).isEqualByComparingTo("26.7");

        // 99,986 x 12 / 6,000,000 x 100 = 19.9972 -> 20.0
        BudgetResult r2 = calc("0", "100000", "1.0", 35, "10.0", "6000000");
        assertThat(r2.burdenRatioPercent()).isEqualByComparingTo("20.0");
    }

    @Test
    void mediumCase_30y_2_5pct_withIncome() {
        BudgetResult r = calc("10000000", "200000", "2.5", 30, "7.5", "9000000");

        assertThat(l(r.maxLoanAmount())).isEqualTo(50_610_000L);
        assertThat(l(r.totalBudget())).isEqualTo(60_610_000L);
        assertThat(l(r.maxPropertyPrice())).isEqualTo(56_380_000L);
        assertThat(l(r.closingCosts())).isEqualTo(4_228_500L);
        assertThat(l(r.monthlyPayment())).isEqualTo(199_971L);
        assertThat(r.loanExceedsPrice()).isFalse();
        assertThat(r.burdenRatioPercent()).isEqualByComparingTo("26.7");
    }

    @Test
    void invariantsHoldAcrossInputs() {
        String[] downs = {"0", "1", "999999", "5000000", "123456789"};
        String[] monthlies = {"1", "7", "12345", "100000", "1234567", "10000000"};
        String[] rates = {"0", "0.001", "1.0", "3.5", "12.34", "20"};
        int[] yearsList = {1, 15, 35, 50};
        String[] closings = {"0", "0.5", "7.5", "10.0", "30"};
        String[] incomes = {null, "1", "3999999", "4000000", "123456789"};

        for (String down : downs) {
            for (String m : monthlies) {
                for (String rate : rates) {
                    for (int y : yearsList) {
                        for (String c : closings) {
                            for (String inc : incomes) {
                                BudgetResult r = calc(down, m, rate, y, c, inc);
                                assertInvariants(r, new BigDecimal(m));
                            }
                        }
                    }
                }
            }
        }
    }

    private static void assertInvariants(BudgetResult r, BigDecimal desired) {
        BigDecimal ten4 = BigDecimal.valueOf(10_000);
        assertThat(r.monthlyPayment()).isLessThanOrEqualTo(desired);
        assertThat(r.maxPropertyPrice().remainder(ten4).signum()).isZero();
        assertThat(r.maxLoanAmount().remainder(ten4).signum()).isZero();
        // price + closingCosts <= totalBudget (integers; closing HALF_UP of a value <= price x c/100)
        assertThat(r.maxPropertyPrice().add(r.closingCosts())).isLessThanOrEqualTo(r.totalBudget());
        assertThat(r.totalBudget()).isEqualTo(r.maxLoanAmount().add(r.downPayment()));
        assertThat(r.maxPropertyPrice().signum()).isGreaterThanOrEqualTo(0);
        assertThat(r.maxLoanAmount().signum()).isGreaterThanOrEqualTo(0);
        assertThat(r.closingCosts().signum()).isGreaterThanOrEqualTo(0);
        assertThat(r.monthlyPayment().signum()).isGreaterThanOrEqualTo(0);
        assertThat(r.closingCosts().scale()).isZero();
        assertThat(r.monthlyPayment().scale()).isZero();
        assertThat(r.loanExceedsPrice())
                .isEqualTo(r.maxLoanAmount().compareTo(r.maxPropertyPrice()) > 0);
        if (r.burdenRatioPercent() != null) {
            assertThat(r.burdenRatioPercent().scale()).isEqualTo(1);
            assertThat(r.burdenRatioPercent().signum()).isGreaterThanOrEqualTo(0);
        }
    }

    @Test
    void closingCostsRoundHalfUp_exactHalfGoesUp() {
        // loan 35,420,000 + down 1,311,837 = 36,731,837; /1.00005 -> price 36,730,000 (floor 10k).
        // closing = 36,730,000 x 0.005 / 100 = 1,836.5 exactly -> HALF_UP 1,837.
        BudgetResult r = calc("1311837", "100000", "1.0", 35, "0.005", null);
        assertThat(l(r.maxPropertyPrice())).isEqualTo(36_730_000L);
        assertThat(l(r.closingCosts())).isEqualTo(1_837L);
    }
}
