package com.example.mortgage.prepayment;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/simulations")
public class PrepaymentController {

    private final PrepaymentService prepaymentService;

    public PrepaymentController(PrepaymentService prepaymentService) {
        this.prepaymentService = prepaymentService;
    }

    @PostMapping("/prepayment")
    public ResponseEntity<PrepaymentResponse> prepayment(@Valid @RequestBody PrepaymentRequest request) {
        return ResponseEntity.ok(prepaymentService.simulate(request));
    }
}
