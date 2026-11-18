package com.example.mortgage.totalcost.domain;

import com.example.mortgage.simulation.domain.RepaymentMethod;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Expected values come from tmp/totalcost_expected.py (exact Fraction arithmetic, written independently of
 * this code; output in tmp/totalcost_expected.json). They were NOT produced by TotalCostCalculator.
 */
class TotalCostCalculatorTest {

    private static TotalCostResult calc(String price, String down, String closingRate, String annual, int years,
                                        RepaymentMethod method, String fee, String repair, String tax, String ins) {
        return TotalCostCalculator.calculate(new BigDecimal(price), new BigDecimal(down),
                new BigDecimal(closingRate), new BigDecimal(annual), years, method,
                new BigDecimal(fee), new BigDecimal(repair), new BigDecimal(tax), new BigDecimal(ins));
    }

    private static TotalCostResult plain(String price, String down, String closingRate, String annual, int years,
                                         RepaymentMethod method) {
        return calc(price, down, closingRate, annual, years, method, "0", "0", "0", "0");
    }

    private static long l(BigDecimal v) {
        return v.longValueExact();
    }

    @Test
    void equalPayment_noOwnershipCost_35y() {
        TotalCostResult r = plain("30000000", "3000000", "10", "1.2", 35, RepaymentMethod.EQUAL_PAYMENT);

        assertThat(l(r.closingCost())).isEqualTo(3_000_000L);
        assertThat(l(r.loanPrincipal())).isEqualTo(30_000_000L);
        assertThat(l(r.initialCost())).isEqualTo(3_000_000L);
        assertThat(l(r.totalLoanPayment())).isEqualTo(36_754_454L);
        assertThat(l(r.totalInterest())).isEqualTo(6_754_454L);
        assertThat(l(r.totalOwnershipCost())).isZero();
        assertThat(l(r.grandTotal())).isEqualTo(39_754_454L);
        assertThat(l(r.monthlyAverage())).isEqualTo(94_653L);
        assertThat(l(r.firstMonthLoanPayment())).isEqualTo(87_511L);

        assertThat(r.years()).hasSize(35);
        TotalCostResult.YearRow y1 = r.years().get(0);
        assertThat(y1.year()).isEqualTo(1);
        assertThat(l(y1.loanPayment())).isEqualTo(1_050_132L);
        assertThat(l(y1.interestPaid())).isEqualTo(356_190L);
        assertThat(l(y1.principalPaid())).isEqualTo(693_942L);
        assertThat(l(y1.yearEndBalance())).isEqualTo(29_306_058L);
        assertThat(l(y1.ownershipCost())).isZero();
        assertThat(l(y1.yearTotal())).isEqualTo(1_050_132L);
        assertThat(l(y1.cumulativeOutlay())).isEqualTo(4_050_132L);
        assertThat(l(r.years().get(1).cumulativeOutlay())).isEqualTo(5_100_264L);

        TotalCostResult.YearRow y35 = r.years().get(34);
        assertThat(l(y35.loanPayment())).isEqualTo(1_049_966L);
        assertThat(l(y35.yearEndBalance())).isZero();
        assertThat(l(y35.cumulativeOutlay())).isEqualTo(39_754_454L);
    }

    @Test
    void equalPrincipal_withOwnershipCost_35y() {
        TotalCostResult r = calc("30000000", "3000000", "10", "1.2", 35, RepaymentMethod.EQUAL_PRINCIPAL,
                "15000", "10000", "120000", "30000");

        // ownership per year = (15,000 + 10,000) x 12 + 120,000 + 30,000 = 450,000
        assertThat(l(r.totalLoanPayment())).isEqualTo(36_314_982L);
        assertThat(l(r.totalInterest())).isEqualTo(6_314_982L);
        assertThat(l(r.totalOwnershipCost())).isEqualTo(15_750_000L);
        assertThat(l(r.grandTotal())).isEqualTo(55_064_982L);
        assertThat(l(r.monthlyAverage())).isEqualTo(131_107L);
        assertThat(l(r.firstMonthLoanPayment())).isEqualTo(101_429L);

        TotalCostResult.YearRow y1 = r.years().get(0);
        assertThat(l(y1.loanPayment())).isEqualTo(1_212_434L);
        assertThat(l(y1.interestPaid())).isEqualTo(355_286L);
        assertThat(l(y1.principalPaid())).isEqualTo(857_148L);
        assertThat(l(y1.yearEndBalance())).isEqualTo(29_142_852L);
        assertThat(l(y1.ownershipCost())).isEqualTo(450_000L);
        assertThat(l(y1.yearTotal())).isEqualTo(1_662_434L);
        assertThat(l(y1.cumulativeOutlay())).isEqualTo(4_662_434L);
        assertThat(l(r.years().get(1).cumulativeOutlay())).isEqualTo(6_314_582L);

        TotalCostResult.YearRow y35 = r.years().get(34);
        assertThat(l(y35.loanPayment())).isEqualTo(862_707L);
        assertThat(l(y35.principalPaid())).isEqualTo(857_136L);
        assertThat(l(y35.yearTotal())).isEqualTo(1_312_707L);
        assertThat(l(y35.cumulativeOutlay())).isEqualTo(55_064_982L);
    }

    @Test
    void oneYear_equalPayment_withOwnershipCost() {
        TotalCostResult r = calc("5000000", "1000000", "10", "1.0", 1, RepaymentMethod.EQUAL_PAYMENT,
                "10000", "5000", "50000", "20000");

        // ownership = 15,000 x 12 + 50,000 + 20,000 = 250,000
        assertThat(l(r.closingCost())).isEqualTo(500_000L);
        assertThat(l(r.loanPrincipal())).isEqualTo(4_500_000L);
        assertThat(l(r.initialCost())).isEqualTo(1_000_000L);
        assertThat(l(r.totalLoanPayment())).isEqualTo(4_524_413L);
        assertThat(l(r.totalInterest())).isEqualTo(24_413L);
        assertThat(l(r.totalOwnershipCost())).isEqualTo(250_000L);
        assertThat(l(r.grandTotal())).isEqualTo(5_774_413L);
        assertThat(l(r.monthlyAverage())).isEqualTo(481_201L);
        assertThat(l(r.firstMonthLoanPayment())).isEqualTo(377_034L);
        assertThat(r.years()).hasSize(1);
        assertThat(l(r.years().get(0).yearEndBalance())).isZero();
        assertThat(l(r.years().get(0).yearTotal())).isEqualTo(4_774_413L);
        assertThat(l(r.years().get(0).cumulativeOutlay())).isEqualTo(5_774_413L);
    }

    @Test
    void fiftyYears_equalPrincipal_zeroDown_ownershipEveryYear() {
        TotalCostResult r = calc("40000000", "0", "10", "0.5", 50, RepaymentMethod.EQUAL_PRINCIPAL,
                "20000", "8000", "150000", "40000");

        // ownership = 28,000 x 12 + 150,000 + 40,000 = 526,000 per year
        assertThat(l(r.closingCost())).isEqualTo(4_000_000L);
        assertThat(l(r.loanPrincipal())).isEqualTo(44_000_000L);
        assertThat(l(r.initialCost())).isZero();
        assertThat(l(r.totalLoanPayment())).isEqualTo(49_509_167L);
        assertThat(l(r.totalInterest())).isEqualTo(5_509_167L);
        assertThat(l(r.totalOwnershipCost())).isEqualTo(26_300_000L);
        assertThat(l(r.grandTotal())).isEqualTo(75_809_167L);
        assertThat(l(r.monthlyAverage())).isEqualTo(126_349L);
        assertThat(l(r.firstMonthLoanPayment())).isEqualTo(91_667L);
        assertThat(r.years()).hasSize(50);
        TotalCostResult.YearRow y50 = r.years().get(49);
        assertThat(l(y50.loanPayment())).isEqualTo(882_380L);
        assertThat(l(y50.ownershipCost())).isEqualTo(526_000L);
        assertThat(l(y50.yearEndBalance())).isZero();
        assertThat(l(y50.cumulativeOutlay())).isEqualTo(75_809_167L);
    }

    @Test
    void zeroRate_equalPayment_zeroDown() {
        TotalCostResult r = plain("24000000", "4000000", "0", "0", 10, RepaymentMethod.EQUAL_PAYMENT);

        assertThat(l(r.closingCost())).isZero();
        assertThat(l(r.loanPrincipal())).isEqualTo(20_000_000L);
        assertThat(l(r.totalLoanPayment())).isEqualTo(20_000_000L);
        assertThat(l(r.totalInterest())).isZero();
        assertThat(l(r.grandTotal())).isEqualTo(24_000_000L);
        assertThat(l(r.monthlyAverage())).isEqualTo(200_000L);
        assertThat(l(r.firstMonthLoanPayment())).isEqualTo(166_667L);
        assertThat(l(r.years().get(0).loanPayment())).isEqualTo(2_000_004L);
        assertThat(l(r.years().get(0).yearEndBalance())).isEqualTo(17_999_996L);
    }

    @Test
    void closingCost_roundsHalfUpToWholeYen() {
        // 1,000,005 x 10% = 100,000.5 -> 100,001
        TotalCostResult half = plain("1000005", "0", "10", "1.0", 20, RepaymentMethod.EQUAL_PAYMENT);
        assertThat(l(half.closingCost())).isEqualTo(100_001L);
        assertThat(l(half.loanPrincipal())).isEqualTo(1_100_006L);
        assertThat(l(half.initialCost())).isZero();
        assertThat(l(half.totalLoanPayment())).isEqualTo(1_214_129L);
        assertThat(l(half.totalInterest())).isEqualTo(114_123L);
        assertThat(l(half.grandTotal())).isEqualTo(1_214_129L);
        assertThat(l(half.monthlyAverage())).isEqualTo(5_059L);
        assertThat(l(half.firstMonthLoanPayment())).isEqualTo(5_059L);

        // 12,345,677 x 7.5% = 925,925.775 -> 925,926
        TotalCostResult frac = plain("12345677", "2000000", "7.5", "2.0", 30, RepaymentMethod.EQUAL_PAYMENT);
        assertThat(l(frac.closingCost())).isEqualTo(925_926L);
        assertThat(l(frac.loanPrincipal())).isEqualTo(11_271_603L);
        assertThat(l(frac.initialCost())).isEqualTo(2_000_000L);
        assertThat(l(frac.totalLoanPayment())).isEqualTo(14_998_346L);
        assertThat(l(frac.totalInterest())).isEqualTo(3_726_743L);
        assertThat(l(frac.grandTotal())).isEqualTo(16_998_346L);
        assertThat(l(frac.monthlyAverage())).isEqualTo(47_218L);
        assertThat(l(frac.firstMonthLoanPayment())).isEqualTo(41_662L);
    }

    @Test
    void notesListAllModellingCodes() {
        TotalCostResult r = plain("30000000", "3000000", "10", "1.2", 35, RepaymentMethod.EQUAL_PAYMENT);
        assertThat(r.notes()).containsExactly(TotalCostNote.values());
    }

    @Test
    void nonPositivePrincipal_isRejected() {
        // 33,000,000 = price + closing exactly -> principal 0
        assertThatThrownBy(() -> plain("30000000", "33000000", "10", "1.2", 35, RepaymentMethod.EQUAL_PAYMENT))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void yearRowsAreOrderedAndCumulativeIsRunningSum() {
        TotalCostResult r = calc("5000000", "0", "10", "1.0", 3, RepaymentMethod.EQUAL_PAYMENT,
                "10000", "0", "0", "0");
        List<TotalCostResult.YearRow> rows = r.years();
        BigDecimal running = r.initialCost();
        for (int i = 0; i < rows.size(); i++) {
            assertThat(rows.get(i).year()).isEqualTo(i + 1);
            running = running.add(rows.get(i).yearTotal());
            assertThat(rows.get(i).cumulativeOutlay()).isEqualByComparingTo(running);
        }
        assertThat(rows.get(rows.size() - 1).cumulativeOutlay()).isEqualByComparingTo(r.grandTotal());
    }
}
