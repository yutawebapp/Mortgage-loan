package com.example.mortgage.product;

import com.example.mortgage.common.InvalidQueryParameterException;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ProductListResponse list(
            @RequestParam(required = false) RateType rateType,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        ProductSort sortKey = ProductSort.parse(sort)
                .orElseThrow(() -> new InvalidQueryParameterException("sort"));
        return productService.findProducts(rateType, sortKey, page, size);
    }

    @GetMapping("/{id}")
    public ProductDetailResponse detail(@PathVariable long id) {
        return productService.findProductDetail(id);
    }

    @ExceptionHandler(ProductNotFoundException.class)
    public ProblemDetail handleNotFound(ProductNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "指定された商品が見つかりません。");
        problem.setTitle("Product not found");
        problem.setType(URI.create("about:blank"));
        return problem;
    }
}
