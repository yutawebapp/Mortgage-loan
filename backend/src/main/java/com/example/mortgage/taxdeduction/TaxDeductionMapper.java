package com.example.mortgage.taxdeduction;

import com.example.mortgage.taxdeduction.domain.ConditionCode;
import com.example.mortgage.taxdeduction.domain.DeductionRule;
import com.example.mortgage.taxdeduction.domain.EnergyClass;
import com.example.mortgage.taxdeduction.domain.HousingType;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/** SQL lives in mapper/TaxDeductionMapper.xml. Never build SQL from user input with ${}. */
@Mapper
public interface TaxDeductionMapper {

    /**
     * @return the rule whose move-in year range contains moveInYear, or null when none matches
     */
    DeductionRule findDeductionRule(@Param("housingType") HousingType housingType,
                                    @Param("energyClass") EnergyClass energyClass,
                                    @Param("conditionCode") ConditionCode conditionCode,
                                    @Param("moveInYear") int moveInYear);

    /** Bracket rows valid for taxYear, ordered by table_code then sort_order. */
    List<TaxBracketRow> findTaxBrackets(@Param("taxYear") int taxYear);

    /** Scalar parameter rows valid for taxYear. */
    List<TaxScalarRow> findTaxScalars(@Param("taxYear") int taxYear);
}
