package com.example.mortgage.ratetype;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/simulations")
public class RateTypeController {

    private final RateTypeService rateTypeService;

    public RateTypeController(RateTypeService rateTypeService) {
        this.rateTypeService = rateTypeService;
    }

    @PostMapping("/rate-types")
    public ResponseEntity<RateTypeResponse> rateTypes(@Valid @RequestBody RateTypeRequest request) {
        return ResponseEntity.ok(rateTypeService.simulate(request));
    }
}
