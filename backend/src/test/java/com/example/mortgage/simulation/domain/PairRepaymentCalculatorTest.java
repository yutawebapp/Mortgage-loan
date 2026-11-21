package com.example.mortgage.simulation.domain;

import com.example.mortgage.simulation.domain.PairRepaymentCalculator.PairResult;
import com.example.mortgage.simulation.domain.PairRepaymentCalculator.PairShareNote;
import com.example.mortgage.simulation.domain.PairRepaymentCalculator.PersonLoan;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Expected values below were computed independently with python3 (decimal module, ROUND_HALF_UP,
 * annuity schedule: interest = round(balance * annual / 1200), payment = round(P*r*A/(A-1)),
 * bonus loan at annual/2 for n*2 periods, split = round(x * share / 100) and the partner gets the rest),
 * NOT with this code.
 */
class PairRepaymentCalculatorTest {

    private static PairResult calc(String principal, String ratePct, int years, String bonus, int share) {
        return calc(principal, ratePct, years, RepaymentMethod.EQUAL_PAYMENT, bonus, share);
    }

    private static PairResult calc(String principal, String ratePct, int years,
                                   RepaymentMethod method, String bonus, int share) {
        return PairRepaymentCalculator.calculate(new BigDecimal(principal), new BigDecimal(ratePct),
                years, method, new BigDecimal(bonus), share);
    }

    private static long l(BigDecimal v) {
        return v.longValueExact();
    }

    private static void assertPerson(PersonLoan loan, long principal, long bonus,
                                     long monthly, long bonusPay, long total, long interest) {
        assertThat(l(loan.principal())).isEqualTo(principal);
        assertThat(l(loan.bonusAmount())).isEqualTo(bonus);
        assertThat(l(loan.repayment().monthlyPayment())).isEqualTo(monthly);
        assertThat(l(loan.repayment().bonusPayment())).isEqualTo(bonusPay);
        assertThat(l(loan.repayment().totalPayment())).isEqualTo(total);
        assertThat(l(loan.repayment().totalInterest())).isEqualTo(interest);
    }

    @Test
    void equalSplit_40M_1_5percent_35years() {
        PairResult r = calc("40000000", "1.5", 35, "0", 50);

        assertPerson(r.self(), 20_000_000L, 0L, 61_237L, 0L, 25_719_482L, 5_719_482L);
        assertPerson(r.partner(), 20_000_000L, 0L, 61_237L, 0L, 25_719_482L, 5_719_482L);
        assertThat(r.notes()).containsExactly(PairShareNote.PAIR_SHARE_PROVISIONAL);
    }

    @Test
    void unevenSplit_70percent_self() {
        PairResult r = calc("40000000", "1.5", 35, "0", 70);

        assertPerson(r.self(), 28_000_000L, 0L, 85_732L, 0L, 36_007_243L, 8_007_243L);
        assertPerson(r.partner(), 12_000_000L, 0L, 36_742L, 0L, 15_431_711L, 3_431_711L);
    }

    @Test
    void withBonus_splitProportionally() {
        PairResult r = calc("40000000", "1.5", 35, "10000000", 50);

        assertPerson(r.self(), 20_000_000L, 5_000_000L, 45_928L, 92_073L, 25_734_706L, 5_734_706L);
        assertPerson(r.partner(), 20_000_000L, 5_000_000L, 45_928L, 92_073L, 25_734_706L, 5_734_706L);
    }

    @Test
    void zeroRate_isPrincipalSharePerMonth() {
        PairResult r = calc("40000000", "0", 35, "0", 50);

        // 20,000,000 / 420 = 47619.05 -> 47619
        assertPerson(r.self(), 20_000_000L, 0L, 47_619L, 0L, 20_000_000L, 0L);
        assertPerson(r.partner(), 20_000_000L, 0L, 47_619L, 0L, 20_000_000L, 0L);
    }

    @Test
    void sharesAddUpToWholePrincipalAndBonus_evenWithOddAmounts() {
        // 33% of 1,000,000,001 and of 10,000,001 bonus: both rounded, partner takes the remainder.
        PairResult r = calc("1000000001", "1.2", 30, "10000001", 33);

        assertThat(l(r.self().principal()) + l(r.partner().principal())).isEqualTo(1_000_000_001L);
        assertThat(l(r.self().bonusAmount()) + l(r.partner().bonusAmount())).isEqualTo(10_000_001L);
        assertThat(l(r.self().principal())).isEqualTo(330_000_000L);
        assertThat(l(r.partner().principal())).isEqualTo(670_000_001L);
    }

    @Test
    void shareOfOneYen_partnerGetsRemainder() {
        // round(1 * 99 / 100) = 1 for self, partner 0: the zero-principal loan must not fail.
        PairResult r = calc("1", "1.0", 1, "0", 99);

        assertThat(l(r.self().principal())).isEqualTo(1L);
        assertThat(l(r.partner().principal())).isZero();
        assertThat(l(r.partner().repayment().totalPayment())).isZero();
    }

    @Test
    void equalPrincipal_equalSplit_40M_1_5percent_35years() {
        PairResult r = calc("40000000", "1.5", 35, RepaymentMethod.EQUAL_PRINCIPAL, "0", 50);

        // first month: interest 25,000 + principal 47,620 (first 20 periods carry +1 yen)
        assertPerson(r.self(), 20_000_000L, 0L, 72_620L, 0L, 25_262_500L, 5_262_500L);
        assertPerson(r.partner(), 20_000_000L, 0L, 72_620L, 0L, 25_262_500L, 5_262_500L);
        assertThat(l(r.self().principal()) + l(r.partner().principal())).isEqualTo(40_000_000L);
    }

    @Test
    void equalPrincipal_unevenSplit_withBonus_70percent() {
        PairResult r = calc("40000000", "1.5", 35, RepaymentMethod.EQUAL_PRINCIPAL, "10000000", 70);

        assertPerson(r.self(), 28_000_000L, 7_000_000L, 76_250L, 152_500L, 35_389_480L, 7_389_480L);
        assertPerson(r.partner(), 12_000_000L, 3_000_000L, 32_679L, 65_358L, 15_166_847L, 3_166_847L);
        assertThat(l(r.self().principal()) + l(r.partner().principal())).isEqualTo(40_000_000L);
        assertThat(l(r.self().bonusAmount()) + l(r.partner().bonusAmount())).isEqualTo(10_000_000L);
    }

    @Test
    void invalidShare_rejected() {
        assertThatThrownBy(() -> calc("1000", "1.0", 1, "0", 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> calc("1000", "1.0", 1, "0", 100))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
