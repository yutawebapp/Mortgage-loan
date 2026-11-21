package com.example.mortgage.taxdeduction;

import com.example.mortgage.taxdeduction.domain.TaxParameters;
import com.example.mortgage.taxdeduction.domain.TaxParameters.Bracket;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Loads the tax parameters valid for one tax year from the DB and converts them to the domain record. */
@Component
public class TaxParameterLoader {

    static final String SALARY = "SALARY_DEDUCTION";
    static final String BASIC = "BASIC_DEDUCTION";
    static final String INCOME_TAX = "INCOME_TAX";

    static final String RECONSTRUCTION_RATE = "RECONSTRUCTION_TAX_RATE_PERCENT";
    static final String RESIDENT_RATE = "RESIDENT_TAX_RATE_PERCENT";
    static final String RESIDENT_BASIC = "RESIDENT_BASIC_DEDUCTION";
    static final String RESIDENT_ADJUSTMENT = "RESIDENT_ADJUSTMENT_DEDUCTION";
    static final String RESIDENT_CREDIT_RATE = "RESIDENT_CREDIT_RATE_PERCENT";
    static final String RESIDENT_CREDIT_CAP = "RESIDENT_CREDIT_CAP";

    private final TaxDeductionMapper mapper;

    public TaxParameterLoader(TaxDeductionMapper mapper) {
        this.mapper = mapper;
    }

    /**
     * @throws IllegalStateException when the DB has no complete parameter set for taxYear
     */
    public TaxParameters load(int taxYear) {
        List<TaxBracketRow> brackets = mapper.findTaxBrackets(taxYear);
        List<TaxScalarRow> scalars = mapper.findTaxScalars(taxYear);

        Map<String, BigDecimal> values = scalars.stream()
                .collect(Collectors.toMap(TaxScalarRow::paramKey, TaxScalarRow::paramValue));

        List<Bracket> salary = bracketsOf(brackets, SALARY);
        List<Bracket> basic = bracketsOf(brackets, BASIC);
        List<Bracket> incomeTax = bracketsOf(brackets, INCOME_TAX);
        if (salary.isEmpty() || basic.isEmpty() || incomeTax.isEmpty()) {
            throw new IllegalStateException("tax bracket tables are incomplete for tax year " + taxYear);
        }

        LocalDate verifiedOn = verifiedDates(brackets, scalars).stream()
                .max(LocalDate::compareTo)
                .orElseThrow(() -> new IllegalStateException("no tax parameter rows for tax year " + taxYear));

        Set<String> sources = new LinkedHashSet<>();
        brackets.forEach(r -> sources.add(r.sourceUrl()));
        scalars.forEach(r -> sources.add(r.sourceUrl()));

        return new TaxParameters(
                salary,
                basic,
                incomeTax,
                required(values, RECONSTRUCTION_RATE, taxYear),
                required(values, RESIDENT_RATE, taxYear),
                required(values, RESIDENT_BASIC, taxYear),
                required(values, RESIDENT_ADJUSTMENT, taxYear),
                required(values, RESIDENT_CREDIT_RATE, taxYear),
                required(values, RESIDENT_CREDIT_CAP, taxYear),
                verifiedOn,
                List.copyOf(sources));
    }

    private static List<Bracket> bracketsOf(List<TaxBracketRow> rows, String tableCode) {
        List<Bracket> out = new ArrayList<>();
        for (TaxBracketRow r : rows) {
            if (tableCode.equals(r.tableCode())) {
                out.add(new Bracket(r.upperLimit(), r.ratePercent(), r.amount()));
            }
        }
        return out;
    }

    private static List<LocalDate> verifiedDates(List<TaxBracketRow> brackets, List<TaxScalarRow> scalars) {
        List<LocalDate> dates = new ArrayList<>();
        brackets.forEach(r -> dates.add(r.verifiedOn()));
        scalars.forEach(r -> dates.add(r.verifiedOn()));
        return dates;
    }

    private static BigDecimal required(Map<String, BigDecimal> values, String key, int taxYear) {
        BigDecimal v = values.get(key);
        if (v == null) {
            throw new IllegalStateException("missing tax parameter " + key + " for tax year " + taxYear);
        }
        return v;
    }
}
