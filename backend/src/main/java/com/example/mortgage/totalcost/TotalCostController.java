package com.example.mortgage.totalcost;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/simulations")
public class TotalCostController {

    private final TotalCostService totalCostService;

    public TotalCostController(TotalCostService totalCostService) {
        this.totalCostService = totalCostService;
    }

    @PostMapping("/total-cost")
    public ResponseEntity<TotalCostResponse> totalCost(@Valid @RequestBody TotalCostRequest request) {
        return ResponseEntity.ok(totalCostService.simulate(request));
    }
}
