package com.example.mortgage.rentvsbuy;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/simulations")
public class RentVsBuyController {

    private final RentVsBuyService rentVsBuyService;

    public RentVsBuyController(RentVsBuyService rentVsBuyService) {
        this.rentVsBuyService = rentVsBuyService;
    }

    @PostMapping("/rent-vs-buy")
    public ResponseEntity<RentVsBuyResponse> rentVsBuy(@Valid @RequestBody RentVsBuyRequest request) {
        return ResponseEntity.ok(rentVsBuyService.simulate(request));
    }
}
