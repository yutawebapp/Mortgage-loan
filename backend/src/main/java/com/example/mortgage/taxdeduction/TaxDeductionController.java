package com.example.mortgage.taxdeduction;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/simulations")
public class TaxDeductionController {

    private final TaxDeductionService taxDeductionService;

    public TaxDeductionController(TaxDeductionService taxDeductionService) {
        this.taxDeductionService = taxDeductionService;
    }

    @PostMapping("/tax-deduction")
    public ResponseEntity<TaxDeductionResponse> taxDeduction(@Valid @RequestBody TaxDeductionRequest request) {
        return ResponseEntity.ok(taxDeductionService.estimate(request));
    }
}
