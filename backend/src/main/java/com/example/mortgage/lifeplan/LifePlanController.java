package com.example.mortgage.lifeplan;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/simulations")
public class LifePlanController {

    private final LifePlanService lifePlanService;

    public LifePlanController(LifePlanService lifePlanService) {
        this.lifePlanService = lifePlanService;
    }

    @PostMapping("/life-plan")
    public ResponseEntity<LifePlanResponse> lifePlan(@Valid @RequestBody LifePlanRequest request) {
        return ResponseEntity.ok(lifePlanService.simulate(request));
    }
}
