package com.example.mortgage.taxdeduction;

import com.example.mortgage.common.BorrowerMode;
import com.example.mortgage.common.RoundingPolicy;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import com.example.mortgage.taxdeduction.domain.EnergyClass;
import com.example.mortgage.taxdeduction.domain.HousingType;
import jakarta.validation.constraints.AssertTrue;
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
 * <p>Person A is the main borrower and uses the unprefixed fields (childcareHousehold, annualIncome,
 * socialInsuranceRatePercent). Person B (partner) is used only for PAIR_LOAN / JOINT_DEBT; for SINGLE and
 * JOINT_GUARANTEE the partner fields are accepted but ignored. principal is the TOTAL loan amount.
 *
 * @param housingType                NEW / USED / RESALE (買取再販)
 * @param energyClass                CERTIFIED / ZEH / ENERGY_STANDARD / OTHER
 * @param moveInYear                 入居年 (= 借入実行年), 2026..2030
 * @param moveInMonth                借入実行月, 1..12 (first repayment is the following month)
 * @param childcareHousehold         子育て世帯等 for person A (null means false)
 * @param floorAreaOver50            床面積50㎡以上 (shared by both persons; null means true)
 * @param legacyException            例外該当 (shared; null means false)
 * @param principal                  借入額 total (yen), 1..1,000,000,000
 * @param annualRatePercent          annual rate in percent, 0..20
 * @param years                      repayment term in years, 1..50
 * @param method                     EQUAL_PAYMENT or EQUAL_PRINCIPAL (no bonus)
 * @param annualIncome               person A 額面年収 (yen), 1..1,000,000,000
 * @param socialInsuranceRatePercent person A 社会保険料率 (percent of annual income), 0..30 (null means 15)
 * @param mode                       SINGLE / PAIR_LOAN / JOINT_DEBT / JOINT_GUARANTEE (null means SINGLE)
 * @param partnerAnnualIncome        person B 額面年収 (yen); required for PAIR_LOAN / JOINT_DEBT, else ignored
 * @param partnerSocialInsuranceRatePercent person B 社会保険料率, 0..30 (null means 15)
 * @param shareAPercent             person A's share of the loan (= 負担割合 = ownership share), 1..99 (null means 50)
 * @param partnerChildcareHousehold person B's 子育て世帯等 flag (null means false)
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
        BigDecimal socialInsuranceRatePercent,

        BorrowerMode mode,

        @Min(1)
        @Max(1_000_000_000L)
        Long partnerAnnualIncome,

        @DecimalMin("0")
        @DecimalMax("30")
        BigDecimal partnerSocialInsuranceRatePercent,

        @DecimalMin("1")
        @DecimalMax("99")
        BigDecimal shareAPercent,

        Boolean partnerChildcareHousehold) {

    /** Default social insurance rate (仮置き) when omitted. */
    public static final BigDecimal DEFAULT_SOCIAL_INSURANCE_RATE_PERCENT = BigDecimal.valueOf(15);
    /** Default share of person A (50:50) when omitted. */
    public static final BigDecimal DEFAULT_SHARE_A_PERCENT = BigDecimal.valueOf(50);

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
        if (mode == null) {
            mode = BorrowerMode.SINGLE;
        }
        if (partnerSocialInsuranceRatePercent == null) {
            partnerSocialInsuranceRatePercent = DEFAULT_SOCIAL_INSURANCE_RATE_PERCENT;
        }
        if (shareAPercent == null) {
            shareAPercent = DEFAULT_SHARE_A_PERCENT;
        }
        if (partnerChildcareHousehold == null) {
            partnerChildcareHousehold = false;
        }
    }

    /** True when the request is a two-person loan (ペアローン or 連帯債務), i.e. the loan is split. */
    public boolean isSplitLoan() {
        return mode == BorrowerMode.PAIR_LOAN || mode == BorrowerMode.JOINT_DEBT;
    }

    /**
     * Person A's loan share: HALF_UP(principal × shareAPercent / 100) yen. Person B gets the rest.
     * Only meaningful when {@link #isSplitLoan()}.
     */
    public static long principalOfA(long principal, BigDecimal shareAPercent) {
        return RoundingPolicy.yen(BigDecimal.valueOf(principal)
                .multiply(shareAPercent)
                .divide(BigDecimal.valueOf(100))).longValueExact();
    }

    /** Partner income is required for PAIR_LOAN / JOINT_DEBT. */
    @AssertTrue(message = "partnerAnnualIncome is required for PAIR_LOAN or JOINT_DEBT")
    public boolean isPartnerAnnualIncomeProvidedWhenSplit() {
        return !isSplitLoan() || partnerAnnualIncome != null;
    }

    /** Each person of a split loan must have at least 1 yen (shareAPercent close to 0 or 100 with small principal). */
    @AssertTrue(message = "each person's principal must be at least 1 yen")
    public boolean isSplitPrincipalPositive() {
        if (!isSplitLoan() || principal == null) {
            return true;
        }
        long a = principalOfA(principal, shareAPercent);
        return a >= 1 && principal - a >= 1;
    }
}
