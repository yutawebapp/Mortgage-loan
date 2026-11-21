package com.example.mortgage.ratescenario.domain;

import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import com.example.mortgage.simulation.domain.RepaymentResult;
import com.example.mortgage.simulation.domain.RepaymentResult.ScheduleRow;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** One rate change after the specified year's final payment, with no bonus payments. */
public final class RateSwitchSchedule {
    private RateSwitchSchedule() {}

    public record Result(List<BigDecimal> payments, BigDecimal totalInterest) {}

    public static Result calculate(RepaymentResult initial, BigDecimal rateAfter, int years,
                                   RepaymentMethod method, int switchYears) {
        if (switchYears < 1 || switchYears >= years) {
            throw new IllegalArgumentException("switchYears must satisfy 1 <= switchYears < years");
        }
        int switchMonth = switchYears * 12;
        List<ScheduleRow> before = initial.schedule().subList(0, switchMonth);
        BigDecimal balance = before.get(switchMonth - 1).balance();
        RepaymentResult after = RepaymentCalculator.calculate(balance, rateAfter, years - switchYears, method, BigDecimal.ZERO);
        List<BigDecimal> payments = new ArrayList<>(years * 12);
        before.forEach(row -> payments.add(row.payment()));
        after.schedule().forEach(row -> payments.add(row.payment()));
        BigDecimal interest = before.stream().map(ScheduleRow::interest).reduce(BigDecimal.ZERO, BigDecimal::add)
                .add(after.totalInterest());
        return new Result(List.copyOf(payments), interest);
    }
}
