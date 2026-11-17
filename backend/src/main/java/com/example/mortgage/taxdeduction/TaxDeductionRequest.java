package com.example.mortgage.taxdeduction;

import com.example.mortgage.simulation.domain.RepaymentMethod;
import com.example.mortgage.taxdeduction.domain.EnergyClass;
import com.example.mortgage.taxdeduction.domain.HousingType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request body of POST /api/v1/simulations/tax-deduction.
 * Do not log instances of this class (contains user inputs).
 *
 * @param housingType                NEW / USED / RESALE (買取再販)
 * @param energyClass                CERTIFIED / ZEH / ENERGY_STANDARD / OTHER
 * @param moveInYear                 入居年 (= 借入実行年), 2026..2030
 * @param moveInMonth                借入実行月, 1..12 (first repayment is the following month)
 * @param childcareHousehold         子育て世帯等 (null means false)
 * @param floorAreaOver50            床面積50㎡以上 (null means true)
 * @param legacyException            例外該当 (null means false)
 * @param principal                  借入額 (yen), 1..1,000,000,000
 * @param annualRatePercent          annual rate in percent, 0..20
 * @param years                      repayment term in years, 1..50
 * @param method                     EQUAL_PAYMENT or EQUAL_PRINCIPAL (no bonus)
 * @param annualIncome               額面年収 (yen), 1..1,000,000,000
 * @param socialInsuranceRatePercent 社会保険料率 (percent of annual income), 0..30 (null means 15)
 */
public record TaxDeductionRequest(
        @NotNull HousingType housingType,

        @NotNull EnergyClass energyClass,

        @NotNull
        @Min(2026)
        @Max(2030)
        Integer moveInYear,

        @NotNull
        @Min(1)
        @Max(12)
        Integer moveInMonth,

        Boolean childcareHousehold,

        Boolean floorAreaOver50,

        Boolean legacyException,

        @NotNull
        @Min(1)
        @Max(1_000_000_000L)
        Long principal,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal annualRatePercent,

        @NotNull
        @Min(1)
        @Max(50)
        Integer years,

        @NotNull RepaymentMethod method,

        @NotNull
        @Min(1)
        @Max(1_000_000_000L)
        Long annualIncome,

        @DecimalMin("0")
        @DecimalMax("30")
        BigDecimal socialInsuranceRatePercent) {

    /** Default social insurance rate (仮置き) when omitted. */
    public static final BigDecimal DEFAULT_SOCIAL_INSURANCE_RATE_PERCENT = BigDecimal.valueOf(15);

    public TaxDeductionRequest {
        if (childcareHousehold == null) {
            childcareHousehold = false;
        }
        if (floorAreaOver50 == null) {
            floorAreaOver50 = true;
        }
        if (legacyException == null) {
            legacyException = false;
        }
        if (socialInsuranceRatePercent == null) {
            socialInsuranceRatePercent = DEFAULT_SOCIAL_INSURANCE_RATE_PERCENT;
        }
    }
}
