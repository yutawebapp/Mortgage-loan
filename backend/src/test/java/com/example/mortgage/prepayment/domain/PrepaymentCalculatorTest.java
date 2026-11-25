package com.example.mortgage.prepayment.domain;

import com.example.mortgage.prepayment.domain.PrepaymentResult.Row;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Expected values below were computed independently with python3 (decimal module, prec 80, ROUND_HALF_UP,
 * PMT = P*r*A/(A-1) with A=(1+r)^n; monthly interest = balance*rate/1200 rounded half-up), NOT with this code.
 */
class PrepaymentCalculatorTest {

    private static PrepaymentResult sim(String principal, String ratePct, int years, RepaymentMethod method,
                                        int afterMonth, String amount, PrepaymentType type) {
        return PrepaymentCalculator.simulate(new BigDecimal(principal), new BigDecimal(ratePct), years, method,
                afterMonth, new BigDecimal(amount), type);
    }

    private static long l(BigDecimal v) {
        return v.longValueExact();
    }

    /** Invariants that must hold for every result. */
    private static void assertInvariants(PrepaymentResult r, long principal) {
        List<Row> rows = r.schedule();
        assertThat(rows).hasSize(r.afterPrepayment().months());
        assertThat(l(rows.get(rows.size() - 1).balance())).isZero();
        assertThat(rows.get(rows.size() - 1).month()).isEqualTo(r.afterPrepayment().months());

        long sumPrincipal = 0, sumPayment = 0, sumInterest = 0, sumPrepay = 0;
        for (Row row : rows) {
            sumPrincipal += l(row.principal());
            sumPayment += l(row.payment());
            sumInterest += l(row.interest());
            sumPrepay += l(row.prepayment());
            assertThat(l(row.payment())).isEqualTo(l(row.principal()) + l(row.interest()));
        }
        assertThat(sumPrincipal + l(r.appliedPrepayment())).isEqualTo(principal);
        assertThat(sumPrepay).isEqualTo(l(r.appliedPrepayment()));
        assertThat(l(r.afterPrepayment().totalPayment())).isEqualTo(sumPayment);
        assertThat(l(r.afterPrepayment().totalInterest())).isEqualTo(sumInterest);
        assertThat(l(r.interestSaving())).isGreaterThanOrEqualTo(0L);
        assertThat(l(r.baseline().totalPayment()) - l(r.afterPrepayment().totalPayment())
                - l(r.appliedPrepayment())).isEqualTo(l(r.interestSaving()));
        assertThat(l(r.interestSaving())).isEqualTo(
                l(r.baseline().totalInterest()) - l(r.afterPrepayment().totalInterest()));
        assertThat(r.monthsShortened()).isEqualTo(r.baseline().months() - r.afterPrepayment().months());
    }

    @Test
    void equalPayment_shortenTerm_30M_1_2pct_35y_after60_5M() {
        PrepaymentResult r = sim("30000000", "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 60, "5000000",
                PrepaymentType.SHORTEN_TERM);

        assertThat(l(r.appliedPrepayment())).isEqualTo(5_000_000L);
        assertThat(l(r.baseline().monthlyPayment())).isEqualTo(87_511L);
        assertThat(r.baseline().months()).isEqualTo(420);
        assertThat(l(r.baseline().totalPayment())).isEqualTo(36_754_454L);
        assertThat(l(r.baseline().totalInterest())).isEqualTo(6_754_454L);
        assertThat(r.afterPrepayment().months()).isEqualTo(342);
        assertThat(l(r.afterPrepayment().monthlyPaymentBefore())).isEqualTo(87_511L);
        assertThat(l(r.afterPrepayment().monthlyPaymentAfter())).isEqualTo(87_511L);
        assertThat(l(r.afterPrepayment().totalPayment())).isEqualTo(29_863_927L);
        assertThat(l(r.afterPrepayment().totalInterest())).isEqualTo(4_863_927L);
        assertThat(l(r.interestSaving())).isEqualTo(1_890_527L);
        assertThat(r.monthsShortened()).isEqualTo(78);
        assertInvariants(r, 30_000_000L);
    }

    @Test
    void equalPayment_reducePayment_30M_1_2pct_35y_after60_5M() {
        PrepaymentResult r = sim("30000000", "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 60, "5000000",
                PrepaymentType.REDUCE_PAYMENT);

        assertThat(l(r.appliedPrepayment())).isEqualTo(5_000_000L);
        assertThat(r.afterPrepayment().months()).isEqualTo(420);
        assertThat(l(r.afterPrepayment().monthlyPaymentBefore())).isEqualTo(87_511L);
        assertThat(l(r.afterPrepayment().monthlyPaymentAfter())).isEqualTo(70_965L);
        assertThat(l(r.afterPrepayment().totalPayment())).isEqualTo(30_798_140L);
        assertThat(l(r.afterPrepayment().totalInterest())).isEqualTo(5_798_140L);
        assertThat(l(r.interestSaving())).isEqualTo(956_314L);
        assertThat(r.monthsShortened()).isZero();
        assertInvariants(r, 30_000_000L);
    }

    @Test
    void equalPrincipal_shortenTerm_30M_1_2pct_35y_after60_5M() {
        PrepaymentResult r = sim("30000000", "1.2", 35, RepaymentMethod.EQUAL_PRINCIPAL, 60, "5000000",
                PrepaymentType.SHORTEN_TERM);

        assertThat(l(r.baseline().monthlyPayment())).isEqualTo(101_429L);
        assertThat(l(r.afterPrepayment().monthlyPaymentBefore())).isEqualTo(97_215L);
        assertThat(l(r.afterPrepayment().monthlyPaymentAfter())).isEqualTo(92_143L);
        assertThat(r.afterPrepayment().months()).isEqualTo(350);
        assertThat(l(r.afterPrepayment().totalPayment())).isEqualTo(29_687_482L);
        assertThat(l(r.afterPrepayment().totalInterest())).isEqualTo(4_687_482L);
        assertThat(l(r.interestSaving())).isEqualTo(1_627_500L);
        assertThat(r.monthsShortened()).isEqualTo(70);
        assertInvariants(r, 30_000_000L);
    }

    @Test
    void equalPrincipal_reducePayment_30M_1_2pct_35y_after60_5M() {
        PrepaymentResult r = sim("30000000", "1.2", 35, RepaymentMethod.EQUAL_PRINCIPAL, 60, "5000000",
                PrepaymentType.REDUCE_PAYMENT);

        assertThat(r.afterPrepayment().months()).isEqualTo(420);
        assertThat(l(r.afterPrepayment().monthlyPaymentAfter())).isEqualTo(78_254L);
        assertThat(l(r.afterPrepayment().totalPayment())).isEqualTo(30_412_483L);
        assertThat(l(r.afterPrepayment().totalInterest())).isEqualTo(5_412_483L);
        assertThat(l(r.interestSaving())).isEqualTo(902_499L);
        assertThat(r.monthsShortened()).isZero();
        assertInvariants(r, 30_000_000L);
    }

    @Test
    void amountAboveBalance_isFullPayoff_forBothTypes() {
        // Balance after month 60 is 26,445,546; the requested 100,000,000 is capped to it.
        for (PrepaymentType type : PrepaymentType.values()) {
            PrepaymentResult r = sim("30000000", "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 60, "100000000", type);

            assertThat(l(r.appliedPrepayment())).isEqualTo(26_445_546L);
            assertThat(r.afterPrepayment().months()).isEqualTo(60);
            assertThat(l(r.afterPrepayment().monthlyPaymentBefore())).isEqualTo(87_511L);
            assertThat(l(r.afterPrepayment().monthlyPaymentAfter())).isZero();
            assertThat(l(r.afterPrepayment().totalPayment())).isEqualTo(5_250_660L);
            assertThat(l(r.afterPrepayment().totalInterest())).isEqualTo(1_696_206L);
            assertThat(l(r.interestSaving())).isEqualTo(5_058_248L);
            assertThat(r.monthsShortened()).isEqualTo(360);
            assertInvariants(r, 30_000_000L);
        }
    }

    @Test
    void zeroRate_shortenAndReduce() {
        // 12,000,000 at 0% over 10y, EQUAL_PAYMENT: payment 100,000; prepay 2,000,000 after month 24.
        PrepaymentResult shorten = sim("12000000", "0", 10, RepaymentMethod.EQUAL_PAYMENT, 24, "2000000",
                PrepaymentType.SHORTEN_TERM);
        assertThat(shorten.afterPrepayment().months()).isEqualTo(100);
        assertThat(l(shorten.afterPrepayment().monthlyPaymentAfter())).isEqualTo(100_000L);
        assertThat(l(shorten.afterPrepayment().totalPayment())).isEqualTo(10_000_000L);
        assertThat(l(shorten.interestSaving())).isZero();
        assertThat(shorten.monthsShortened()).isEqualTo(20);
        assertInvariants(shorten, 12_000_000L);

        PrepaymentResult reduce = sim("12000000", "0", 10, RepaymentMethod.EQUAL_PAYMENT, 24, "2000000",
                PrepaymentType.REDUCE_PAYMENT);
        assertThat(reduce.afterPrepayment().months()).isEqualTo(120);
        assertThat(l(reduce.afterPrepayment().monthlyPaymentAfter())).isEqualTo(79_167L); // 7,600,000 / 96
        assertThat(l(reduce.afterPrepayment().totalPayment())).isEqualTo(10_000_000L);
        assertThat(l(reduce.interestSaving())).isZero();
        assertThat(reduce.monthsShortened()).isZero();
        assertInvariants(reduce, 12_000_000L);
    }

    @Test
    void afterMonthOutOfRange_isRejected() {
        assertThatThrownBy(() -> sim("30000000", "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 0, "1",
                PrepaymentType.SHORTEN_TERM)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> sim("30000000", "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 420, "1",
                PrepaymentType.SHORTEN_TERM)).isInstanceOf(IllegalArgumentException.class);
    }
}
