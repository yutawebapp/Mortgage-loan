package com.example.mortgage.refinance;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/simulations")
public class RefinanceController {

    private final RefinanceService refinanceService;

    public RefinanceController(RefinanceService refinanceService) {
        this.refinanceService = refinanceService;
    }

    @PostMapping("/refinance")
    public ResponseEntity<RefinanceResponse> refinance(@Valid @RequestBody RefinanceRequest request) {
        return ResponseEntity.ok(refinanceService.diagnose(request));
    }
}
