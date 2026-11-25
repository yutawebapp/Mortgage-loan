package com.example.mortgage.simulation.domain;

import com.example.mortgage.common.RoundingPolicy;

import java.math.BigDecimal;
import java.util.List;

/**
 * Pure Java split of a two-person loan by 負担割合 (second stage of design.md §7.8).
 *
 * <p>The principal and the bonus amount are split by the self share: self = round(x * share / 100)
 * with {@link RoundingPolicy}, partner = x - self, so the two parts always add up to the whole.
 * Each person's part is then run through {@link RepaymentCalculator#calculate} independently;
 * the amortization logic is not duplicated here.
 *
 * <p>This is a simplified model: each person repays their own share as a separate loan. Actual
 * pair-loan / joint-debt rules vary by bank, so the result is provisional (see
 * {@link PairShareNote#PAIR_SHARE_PROVISIONAL}). Because rounding is per person, the two monthly
 * payments may differ by a few yen from the single-loan payment.
 */
public final class PairRepaymentCalculator {

    private static final BigDecimal PERCENT = BigDecimal.valueOf(100);

    private PairRepaymentCalculator() {
    }

    /**
     * @param principal         whole loan amount in yen (>= 0)
     * @param annualRatePercent annual rate in percent, e.g. 1.2 means 1.2%
     * @param years             loan term in years (>= 1)
     * @param method            repayment method
     * @param bonusAmount       part of principal repaid by bonus payments (0 <= bonus <= principal)
     * @param selfSharePercent  the self borrower's share in percent (1..99)
     */
    public static PairResult calculate(BigDecimal principal,
                                       BigDecimal annualRatePercent,
                                       int years,
                                       RepaymentMethod method,
                                       BigDecimal bonusAmount,
                                       int selfSharePercent) {
        if (selfSharePercent < 1 || selfSharePercent > 99) {
            throw new IllegalArgumentException("selfSharePercent must be 1..99");
        }
        BigDecimal share = BigDecimal.valueOf(selfSharePercent);

        BigDecimal selfPrincipal = share(principal, share);
        BigDecimal selfBonus = share(bonusAmount, share);

        PersonLoan self = loanFor(selfPrincipal, selfBonus, annualRatePercent, years, method);
        PersonLoan partner = loanFor(principal.subtract(selfPrincipal), bonusAmount.subtract(selfBonus),
                annualRatePercent, years, method);

        return new PairResult(self, partner, List.of(PairShareNote.PAIR_SHARE_PROVISIONAL));
    }

    /** Self share of an amount: round(amount * share / 100) to whole yen. */
    private static BigDecimal share(BigDecimal amount, BigDecimal sharePercent) {
        // Dividing by 100 always terminates, so the exact divide cannot throw.
        return RoundingPolicy.yen(amount.multiply(sharePercent).divide(PERCENT));
    }

    private static PersonLoan loanFor(BigDecimal principal, BigDecimal bonusAmount,
                                      BigDecimal annualRatePercent, int years, RepaymentMethod method) {
        RepaymentResult repayment = RepaymentCalculator.calculate(principal, annualRatePercent, years,
                method, bonusAmount);
        return new PersonLoan(principal, bonusAmount, repayment);
    }

    /**
     * One person's loan.
     *
     * @param principal    this person's share of the loan principal (whole yen)
     * @param bonusAmount  this person's share of the bonus-repaid amount (whole yen)
     * @param repayment    repayment result of this person's loan alone
     */
    public record PersonLoan(BigDecimal principal, BigDecimal bonusAmount, RepaymentResult repayment) {
    }

    /**
     * @param self    the self borrower's loan
     * @param partner the partner's loan (principal = whole principal - self principal)
     * @param notes   modelling notes (codes)
     */
    public record PairResult(PersonLoan self, PersonLoan partner, List<PairShareNote> notes) {
    }

    /** Modelling notes returned with a pair split. */
    public enum PairShareNote {
        /**
         * Simplified split: each person repays their own share as a separate loan. Actual pair-loan /
         * joint-debt rules vary by bank; per-person rounding may shift the monthly payments by a few yen.
         */
        PAIR_SHARE_PROVISIONAL
    }
}
