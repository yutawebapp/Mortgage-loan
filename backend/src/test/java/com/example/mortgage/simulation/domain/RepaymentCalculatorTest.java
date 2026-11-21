package com.example.mortgage.simulation.domain;

import com.example.mortgage.simulation.domain.RepaymentResult.ScheduleRow;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Expected values below were computed independently with python3 (decimal module, ROUND_HALF_UP,
 * PMT = P*r/(1-(1+r)^-n)), NOT with this code.
 */
class RepaymentCalculatorTest {

    private static RepaymentResult calc(String principal, String ratePct, int years,
                                        RepaymentMethod method, String bonus) {
        return RepaymentCalculator.calculate(new BigDecimal(principal), new BigDecimal(ratePct),
                years, method, new BigDecimal(bonus));
    }

    private static long l(BigDecimal v) {
        return v.longValueExact();
    }

    @Test
    void equalPayment_30M_1percent_35years_matchesPmt() {
        RepaymentResult r = calc("30000000", "1.0", 35, RepaymentMethod.EQUAL_PAYMENT, "0");

        assertThat(l(r.monthlyPayment())).isEqualTo(84_686L);
        assertThat(l(r.bonusPayment())).isZero();
        assertThat(l(r.totalPayment())).isEqualTo(35_567_972L);
        assertThat(l(r.totalInterest())).isEqualTo(5_567_972L);
        assertThat(r.schedule()).hasSize(35 * 12);
    }

    @Test
    void equalPayment_zeroRate_isPrincipalOverN() {
        RepaymentResult r = calc("30000000", "0", 35, RepaymentMethod.EQUAL_PAYMENT, "0");

        assertThat(l(r.monthlyPayment())).isEqualTo(71_429L); // 30,000,000 / 420 = 71428.57 -> 71429
        assertThat(l(r.totalPayment())).isEqualTo(30_000_000L);
        assertThat(l(r.totalInterest())).isZero();
    }

    @Test
    void equalPayment_withBonus_10M_matchesReference() {
        RepaymentResult r = calc("30000000", "1.0", 35, RepaymentMethod.EQUAL_PAYMENT, "10000000");

        assertThat(l(r.monthlyPayment())).isEqualTo(56_457L);
        assertThat(l(r.bonusPayment())).isEqualTo(169_666L);
        assertThat(l(r.totalPayment())).isEqualTo(35_588_615L);
        assertThat(l(r.totalInterest())).isEqualTo(5_588_615L);
    }

    @Test
    void equalPrincipal_30M_1percent_35years_matchesReference() {
        RepaymentResult r = calc("30000000", "1.0", 35, RepaymentMethod.EQUAL_PRINCIPAL, "0");

        // first month: principal 30,000,000/420 = 71,428.57 -> 71,429 ; interest 30,000,000*1%/12 = 25,000
        assertThat(l(r.monthlyPayment())).isEqualTo(96_429L);
        assertThat(l(r.totalPayment())).isEqualTo(35_262_483L);
        assertThat(l(r.totalInterest())).isEqualTo(5_262_483L);
    }

    @ParameterizedTest
    @EnumSource(RepaymentMethod.class)
    void invariants_hold(RepaymentMethod method) {
        String[][] cases = {
                {"30000000", "1.0", "35", "0"},
                {"30000000", "1.2", "35", "10000000"},
                {"1", "20", "1", "0"},
                {"1000000000", "0", "50", "300000000"},
                {"12345678", "0.37", "7", "12345678"},
                {"5000000", "2.5", "10", "1"},
        };
        for (String[] c : cases) {
            RepaymentResult r = calc(c[0], c[1], Integer.parseInt(c[2]), method, c[3]);
            long principal = Long.parseLong(c[0]);
            int years = Integer.parseInt(c[2]);

            List<ScheduleRow> s = r.schedule();
            assertThat(s).hasSize(years * 12);
            assertThat(l(s.get(s.size() - 1).balance())).as("final balance").isZero();
            assertThat(s.stream().mapToLong(x -> l(x.principal())).sum()).as("sum principal").isEqualTo(principal);
            assertThat(s.stream().mapToLong(x -> l(x.payment())).sum()).as("total payment").isEqualTo(l(r.totalPayment()));
            assertThat(s.stream().mapToLong(x -> l(x.interest())).sum()).as("total interest").isEqualTo(l(r.totalInterest()));
            for (ScheduleRow row : s) {
                assertThat(l(row.payment())).isEqualTo(l(row.principal()) + l(row.interest()));
                assertThat(l(row.bonusPayment()) == 0 || row.month() % 6 == 0).isTrue();
                assertThat(l(row.balance())).isNotNegative();
            }
        }
    }

    @Test
    void bonusMonthsAreExactlyMultiplesOfSix() {
        RepaymentResult r = calc("30000000", "1.0", 3, RepaymentMethod.EQUAL_PAYMENT, "10000000");

        for (ScheduleRow row : r.schedule()) {
            boolean bonusMonth = row.month() % 6 == 0;
            assertThat(row.bonusPayment().signum() > 0).as("month %d", row.month()).isEqualTo(bonusMonth);
        }
        assertThat(r.schedule()).hasSize(36);
    }

    @Test
    void equalPrincipal_paymentsNonIncreasing_ignoringBonusMonths() {
        RepaymentResult r = calc("30000000", "1.3", 35, RepaymentMethod.EQUAL_PRINCIPAL, "10000000");

        long prev = Long.MAX_VALUE;
        for (ScheduleRow row : r.schedule()) {
            if (row.month() % 6 == 0) {
                continue; // bonus month includes bonus payment
            }
            long pay = l(row.payment());
            assertThat(pay).as("month %d", row.month()).isLessThanOrEqualTo(prev);
            prev = pay;
        }
    }

    @Test
    void equalPrincipal_principalPartsNonIncreasing_withoutBonus() {
        RepaymentResult r = calc("1000003", "0", 1, RepaymentMethod.EQUAL_PRINCIPAL, "0");

        long prev = Long.MAX_VALUE;
        for (ScheduleRow row : r.schedule()) {
            assertThat(l(row.principal())).isLessThanOrEqualTo(prev);
            prev = l(row.principal());
        }
    }

    @ParameterizedTest
    @CsvSource({"30000000,0", "30000000,10000000", "30000000,30000000"})
    void bonusRangeEndpoints_finalBalanceZero(String principal, String bonus) {
        RepaymentResult r = calc(principal, "1.0", 10, RepaymentMethod.EQUAL_PAYMENT, bonus);
        assertThat(r.schedule()).hasSize(120);
        assertThat(l(r.schedule().get(119).balance())).isZero();
    }
}
