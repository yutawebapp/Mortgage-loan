package com.example.mortgage.eligibility.domain;

import com.example.mortgage.common.BorrowerMode;
import com.example.mortgage.eligibility.domain.JointEligibilityCalculator.Combined;
import com.example.mortgage.eligibility.domain.JointEligibilityCalculator.Note;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Expected values come from tmp/eligibility_joint_expected.py (exact Fraction arithmetic, independent of
 * this code). Screening rate 3.5%, planned rate 1.0%, 35 years unless noted.
 */
class JointEligibilityCalculatorTest {

    private static Combined calc(BorrowerMode mode, long a, long aOther, long b, long bOther, int countPercent) {
        return JointEligibilityCalculator.calculate(mode,
                BigDecimal.valueOf(a), BigDecimal.valueOf(aOther),
                BigDecimal.valueOf(b), BigDecimal.valueOf(bOther),
                countPercent,
                new BigDecimal("3.5"), new BigDecimal("1.0"), 35);
    }

    private static long l(BigDecimal v) {
        return v.longValueExact();
    }

    @Test
    void single_matchesSingleCalculator() {
        Combined c = calc(BorrowerMode.SINGLE, 6_000_000, 0, 0, 0, 50);

        assertThat(c.mode()).isEqualTo(BorrowerMode.SINGLE);
        assertThat(c.burdenRatioLimitPercent()).isEqualTo(35);
        assertThat(l(c.maxAnnualRepayment())).isEqualTo(2_100_000L);
        assertThat(l(c.availableMonthlyRepayment())).isEqualTo(175_000L);
        assertThat(l(c.atScreeningRate().maxPrincipal())).isEqualTo(42_340_000L);
        assertThat(l(c.atActualRate().monthlyPayment())).isEqualTo(174_989L);
        assertThat(c.persons()).isNull();
        assertThat(c.notes()).isEmpty();
    }

    @Test
    void jointDebt_combinedIncomeStraddlesThreshold_limit35() {
        // A 3,000,000 + B 2,000,000 = 5,000,000 -> 35%: 1,750,000 per year (PAIR_LOAN would give 30% each).
        Combined c = calc(BorrowerMode.JOINT_DEBT, 3_000_000, 0, 2_000_000, 0, 50);

        assertThat(c.burdenRatioLimitPercent()).isEqualTo(35);
        assertThat(l(c.maxAnnualRepayment())).isEqualTo(1_750_000L);
        assertThat(l(c.availableAnnualRepayment())).isEqualTo(1_750_000L);
        assertThat(l(c.availableMonthlyRepayment())).isEqualTo(145_833L);
        assertThat(l(c.atScreeningRate().maxPrincipal())).isEqualTo(35_280_000L);
        assertThat(l(c.atScreeningRate().monthlyPayment())).isEqualTo(145_809L);
        assertThat(l(c.atActualRate().maxPrincipal())).isEqualTo(51_660_000L);
        assertThat(l(c.atActualRate().monthlyPayment())).isEqualTo(145_829L);
        assertThat(c.persons()).isNull();
        assertThat(c.notes()).containsExactly(Note.INCOME_COMBINED_PROVISIONAL);
    }

    @Test
    void jointDebt_otherRepaymentsOfBothAreSubtracted() {
        // other = A 300,000 + B 200,000 = 500,000 -> available 1,250,000 -> monthly 104,166
        Combined c = calc(BorrowerMode.JOINT_DEBT, 3_000_000, 300_000, 2_000_000, 200_000, 50);

        assertThat(c.burdenRatioLimitPercent()).isEqualTo(35);
        assertThat(l(c.availableAnnualRepayment())).isEqualTo(1_250_000L);
        assertThat(l(c.availableMonthlyRepayment())).isEqualTo(104_166L);
        assertThat(l(c.atScreeningRate().maxPrincipal())).isEqualTo(25_200_000L);
        assertThat(l(c.atScreeningRate().monthlyPayment())).isEqualTo(104_149L);
        assertThat(l(c.atActualRate().maxPrincipal())).isEqualTo(36_900_000L);
        assertThat(l(c.atActualRate().monthlyPayment())).isEqualTo(104_163L);
    }

    @Test
    void jointGuarantee_count50_oddPartnerIncome_roundsDown() {
        // A 3,000,000 + floor(2,000,001 x 50 / 100) = 3,000,000 + 1,000,000 = 4,000,000 -> 35%
        Combined c = calc(BorrowerMode.JOINT_GUARANTEE, 3_000_000, 0, 2_000_001, 0, 50);

        assertThat(c.burdenRatioLimitPercent()).isEqualTo(35);
        assertThat(l(c.maxAnnualRepayment())).isEqualTo(1_400_000L);
        assertThat(l(c.availableMonthlyRepayment())).isEqualTo(116_666L);
        assertThat(l(c.atScreeningRate().maxPrincipal())).isEqualTo(28_220_000L);
        assertThat(l(c.atScreeningRate().monthlyPayment())).isEqualTo(116_631L);
        assertThat(l(c.atActualRate().maxPrincipal())).isEqualTo(41_320_000L);
        assertThat(l(c.atActualRate().monthlyPayment())).isEqualTo(116_640L);
        assertThat(c.notes()).containsExactly(Note.INCOME_COMBINED_PROVISIONAL, Note.PARTNER_INCOME_RATIO_ASSUMED);
    }

    @Test
    void jointGuarantee_count0_partnerIncomeNotCounted() {
        // income = A only = 3,000,000 -> 30%: 900,000
        Combined c = calc(BorrowerMode.JOINT_GUARANTEE, 3_000_000, 0, 2_000_001, 0, 0);

        assertThat(c.burdenRatioLimitPercent()).isEqualTo(30);
        assertThat(l(c.maxAnnualRepayment())).isEqualTo(900_000L);
        assertThat(l(c.availableMonthlyRepayment())).isEqualTo(75_000L);
        assertThat(l(c.atScreeningRate().maxPrincipal())).isEqualTo(18_140_000L);
        assertThat(l(c.atScreeningRate().monthlyPayment())).isEqualTo(74_971L);
        assertThat(l(c.atActualRate().maxPrincipal())).isEqualTo(26_560_000L);
        assertThat(l(c.atActualRate().monthlyPayment())).isEqualTo(74_975L);
    }

    @Test
    void jointGuarantee_count100_fullPartnerIncomeCounted() {
        // income = 3,000,000 + 2,000,001 = 5,000,001 -> 35%: floor(1,750,000.35) = 1,750,000
        Combined c = calc(BorrowerMode.JOINT_GUARANTEE, 3_000_000, 0, 2_000_001, 0, 100);

        assertThat(c.burdenRatioLimitPercent()).isEqualTo(35);
        assertThat(l(c.maxAnnualRepayment())).isEqualTo(1_750_000L);
        assertThat(l(c.availableMonthlyRepayment())).isEqualTo(145_833L);
        assertThat(l(c.atScreeningRate().maxPrincipal())).isEqualTo(35_280_000L);
        assertThat(l(c.atActualRate().monthlyPayment())).isEqualTo(145_829L);
    }

    @Test
    void jointGuarantee_count33_oddAmount_floorThenLimitThenOtherRepayments() {
        // floor(2,000,001 x 33 / 100) = floor(660,000.33) = 660,000 -> income 3,660,000 -> 30%: 1,098,000
        // other = 200,000 + 100,000 = 300,000 -> available 798,000 -> monthly 66,500
        Combined c = calc(BorrowerMode.JOINT_GUARANTEE, 3_000_000, 200_000, 2_000_001, 100_000, 33);

        assertThat(c.burdenRatioLimitPercent()).isEqualTo(30);
        assertThat(l(c.maxAnnualRepayment())).isEqualTo(1_098_000L);
        assertThat(l(c.availableAnnualRepayment())).isEqualTo(798_000L);
        assertThat(l(c.availableMonthlyRepayment())).isEqualTo(66_500L);
        assertThat(l(c.atScreeningRate().maxPrincipal())).isEqualTo(16_090_000L);
        assertThat(l(c.atScreeningRate().monthlyPayment())).isEqualTo(66_498L);
        assertThat(l(c.atActualRate().maxPrincipal())).isEqualTo(23_550_000L);
        assertThat(l(c.atActualRate().monthlyPayment())).isEqualTo(66_478L);
    }

    @Test
    void pairLoan_eachPersonLimitedSeparately_sumsAndNullLimit() {
        // A 3,000,000 -> 30%: 900,000 ; B 2,000,000 -> 30%: 600,000 ; sum 1,500,000 (not 35% of 5,000,000)
        Combined c = calc(BorrowerMode.PAIR_LOAN, 3_000_000, 0, 2_000_000, 0, 50);

        assertThat(c.burdenRatioLimitPercent()).isNull();
        assertThat(l(c.maxAnnualRepayment())).isEqualTo(1_500_000L);
        assertThat(l(c.availableAnnualRepayment())).isEqualTo(1_500_000L);
        assertThat(l(c.availableMonthlyRepayment())).isEqualTo(125_000L);
        // sum of each person's principal (each floored to 10,000 individually)
        assertThat(l(c.atScreeningRate().maxPrincipal())).isEqualTo(30_230_000L);
        assertThat(l(c.atScreeningRate().monthlyPayment())).isEqualTo(124_938L);
        assertThat(l(c.atActualRate().maxPrincipal())).isEqualTo(44_270_000L);
        assertThat(l(c.atActualRate().monthlyPayment())).isEqualTo(124_968L);

        assertThat(c.persons()).hasSize(2);
        EligibilityResult a = c.persons().get(0);
        EligibilityResult b = c.persons().get(1);
        assertThat(a.burdenRatioLimitPercent()).isEqualTo(30);
        assertThat(l(a.availableMonthlyRepayment())).isEqualTo(75_000L);
        assertThat(l(a.atScreeningRate().maxPrincipal())).isEqualTo(18_140_000L);
        assertThat(l(a.atScreeningRate().monthlyPayment())).isEqualTo(74_971L);
        assertThat(l(a.atActualRate().maxPrincipal())).isEqualTo(26_560_000L);
        assertThat(l(a.atActualRate().monthlyPayment())).isEqualTo(74_975L);
        assertThat(b.burdenRatioLimitPercent()).isEqualTo(30);
        assertThat(l(b.availableMonthlyRepayment())).isEqualTo(50_000L);
        assertThat(l(b.atScreeningRate().maxPrincipal())).isEqualTo(12_090_000L);
        assertThat(l(b.atScreeningRate().monthlyPayment())).isEqualTo(49_967L);
        assertThat(l(b.atActualRate().maxPrincipal())).isEqualTo(17_710_000L);
        assertThat(l(b.atActualRate().monthlyPayment())).isEqualTo(49_993L);

        assertThat(c.notes()).containsExactly(Note.EACH_PERSON_SCREENED_SEPARATELY);
    }

    @Test
    void pairLoan_otherRepaymentsExceedOnePersonsLimit_thatPersonGetsZero() {
        // A: 900,000 limit, other 1,000,000 -> 0 available. B: 600,000 limit, other 100,000 -> 500,000 -> 41,666/month
        Combined c = calc(BorrowerMode.PAIR_LOAN, 3_000_000, 1_000_000, 2_000_000, 100_000, 50);

        assertThat(l(c.maxAnnualRepayment())).isEqualTo(1_500_000L);
        assertThat(l(c.availableAnnualRepayment())).isEqualTo(500_000L);
        assertThat(l(c.availableMonthlyRepayment())).isEqualTo(41_666L);
        assertThat(l(c.atScreeningRate().maxPrincipal())).isEqualTo(10_080_000L);
        assertThat(l(c.atScreeningRate().monthlyPayment())).isEqualTo(41_660L);
        assertThat(l(c.atActualRate().maxPrincipal())).isEqualTo(14_760_000L);
        assertThat(l(c.atActualRate().monthlyPayment())).isEqualTo(41_665L);

        EligibilityResult a = c.persons().get(0);
        assertThat(l(a.availableMonthlyRepayment())).isZero();
        assertThat(l(a.atScreeningRate().maxPrincipal())).isZero();
        assertThat(l(a.atActualRate().monthlyPayment())).isZero();
        EligibilityResult b = c.persons().get(1);
        assertThat(l(b.availableMonthlyRepayment())).isEqualTo(41_666L);
        assertThat(l(b.atScreeningRate().maxPrincipal())).isEqualTo(10_080_000L);
    }
}
