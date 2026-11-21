package com.example.mortgage.eligibility.domain;

import com.example.mortgage.common.BorrowerMode;
import com.example.mortgage.eligibility.domain.EligibilityResult.Estimate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Objects;

/**
 * Combines the borrowing-capacity estimate for one or two borrowers (pure Java, no Spring).
 * Every limit, rate and rounding rule comes from {@link EligibilityCalculator}.
 *
 * <ul>
 *   <li>SINGLE: the single-person estimate.</li>
 *   <li>JOINT_DEBT (収入合算・連帯債務): income = A + B, other repayments = A + B, one limit from the combined income.</li>
 *   <li>JOINT_GUARANTEE (収入合算・連帯保証): income = A + floor(B x partnerIncomeCountPercent / 100),
 *       other repayments = A + B, one limit from that combined income.</li>
 *   <li>PAIR_LOAN (ペアローン): each person is screened separately; the results are summed.</li>
 * </ul>
 */
public final class JointEligibilityCalculator {

    /** Notes attached to a combined result so that the caller can disclose the assumptions. */
    public enum Note {
        INCOME_COMBINED_PROVISIONAL,
        PARTNER_INCOME_RATIO_ASSUMED,
        EACH_PERSON_SCREENED_SEPARATELY
    }

    /**
     * @param mode                      borrower mode that produced this result
     * @param burdenRatioLimitPercent   limit of the single combined estimate; null for PAIR_LOAN
     * @param maxAnnualRepayment        summed for PAIR_LOAN, otherwise the single estimate's value
     * @param availableAnnualRepayment  summed for PAIR_LOAN, otherwise the single estimate's value
     * @param availableMonthlyRepayment summed for PAIR_LOAN, otherwise the single estimate's value
     * @param atScreeningRate           summed for PAIR_LOAN
     * @param atActualRate              summed for PAIR_LOAN
     * @param persons                   the two separate estimates (A, B) for PAIR_LOAN; null otherwise
     * @param notes                     assumptions to disclose, in a fixed order
     */
    public record Combined(
            BorrowerMode mode,
            Integer burdenRatioLimitPercent,
            BigDecimal maxAnnualRepayment,
            BigDecimal availableAnnualRepayment,
            BigDecimal availableMonthlyRepayment,
            Estimate atScreeningRate,
            Estimate atActualRate,
            List<EligibilityResult> persons,
            List<Note> notes) {
    }

    private static final BigDecimal PERCENT = BigDecimal.valueOf(100);

    private JointEligibilityCalculator() {
    }

    /**
     * @param mode                       borrower mode
     * @param ownIncome                  borrower A's gross annual income in yen (> 0)
     * @param ownOtherRepayments         borrower A's existing annual loan repayments in yen (>= 0)
     * @param partnerIncome              borrower B's gross annual income in yen (> 0); ignored for SINGLE
     * @param partnerOtherRepayments     borrower B's existing annual loan repayments in yen (>= 0); ignored for SINGLE
     * @param partnerIncomeCountPercent  share (0..100) of B's income counted for JOINT_GUARANTEE; ignored otherwise
     * @param screeningRatePercent       screening rate in percent (>= 0)
     * @param actualRatePercent          planned loan rate in percent (>= 0)
     * @param years                      repayment term in years (>= 1)
     */
    public static Combined calculate(BorrowerMode mode,
                                     BigDecimal ownIncome,
                                     BigDecimal ownOtherRepayments,
                                     BigDecimal partnerIncome,
                                     BigDecimal partnerOtherRepayments,
                                     int partnerIncomeCountPercent,
                                     BigDecimal screeningRatePercent,
                                     BigDecimal actualRatePercent,
                                     int years) {
        Objects.requireNonNull(mode, "mode");
        if (mode == BorrowerMode.SINGLE) {
            return single(mode, EligibilityCalculator.calculate(ownIncome, ownOtherRepayments,
                    screeningRatePercent, actualRatePercent, years), List.of());
        }
        Objects.requireNonNull(partnerIncome, "partnerIncome");
        Objects.requireNonNull(partnerOtherRepayments, "partnerOtherRepayments");

        switch (mode) {
            case JOINT_DEBT -> {
                EligibilityResult r = EligibilityCalculator.calculate(
                        ownIncome.add(partnerIncome),
                        ownOtherRepayments.add(partnerOtherRepayments),
                        screeningRatePercent, actualRatePercent, years);
                return single(mode, r, List.of(Note.INCOME_COMBINED_PROVISIONAL));
            }
            case JOINT_GUARANTEE -> {
                BigDecimal countedPartnerIncome = partnerIncome
                        .multiply(BigDecimal.valueOf(partnerIncomeCountPercent))
                        .divide(PERCENT, 0, RoundingMode.DOWN);
                EligibilityResult r = EligibilityCalculator.calculate(
                        ownIncome.add(countedPartnerIncome),
                        ownOtherRepayments.add(partnerOtherRepayments),
                        screeningRatePercent, actualRatePercent, years);
                // Other repayments of B are subtracted in full, the guarantor's income is only partly counted.
                return single(mode, r, List.of(Note.INCOME_COMBINED_PROVISIONAL, Note.PARTNER_INCOME_RATIO_ASSUMED));
            }
            case PAIR_LOAN -> {
                EligibilityResult a = EligibilityCalculator.calculate(
                        ownIncome, ownOtherRepayments, screeningRatePercent, actualRatePercent, years);
                EligibilityResult b = EligibilityCalculator.calculate(
                        partnerIncome, partnerOtherRepayments, screeningRatePercent, actualRatePercent, years);
                                return new Combined(
                        mode,
                        null,
                        a.maxAnnualRepayment().add(b.maxAnnualRepayment()),
                        a.availableAnnualRepayment().add(b.availableAnnualRepayment()),
                        a.availableMonthlyRepayment().add(b.availableMonthlyRepayment()),
                        sum(a.atScreeningRate(), b.atScreeningRate()),
                        sum(a.atActualRate(), b.atActualRate()),
                        List.of(a, b),
                        List.of(Note.EACH_PERSON_SCREENED_SEPARATELY));
            }
            default -> throw new IllegalArgumentException("unsupported mode: " + mode);
        }
    }

    private static Combined single(BorrowerMode mode, EligibilityResult r, List<Note> notes) {
        return new Combined(
                mode,
                r.burdenRatioLimitPercent(),
                r.maxAnnualRepayment(),
                r.availableAnnualRepayment(),
                r.availableMonthlyRepayment(),
                r.atScreeningRate(),
                r.atActualRate(),
                null,
                notes);
    }

    private static Estimate sum(Estimate a, Estimate b) {
        return new Estimate(a.ratePercent(),
                a.maxPrincipal().add(b.maxPrincipal()),
                a.monthlyPayment().add(b.monthlyPayment()));
    }
}
