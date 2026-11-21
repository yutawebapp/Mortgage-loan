package com.example.mortgage.ratescenario;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/simulations")
public class RateScenarioController {

    private final RateScenarioService rateScenarioService;

    public RateScenarioController(RateScenarioService rateScenarioService) {
        this.rateScenarioService = rateScenarioService;
    }

    @PostMapping("/rate-scenarios")
    public ResponseEntity<RateScenarioResponse> rateScenarios(@Valid @RequestBody RateScenarioRequest request) {
        return ResponseEntity.ok(rateScenarioService.simulate(request));
    }
}
