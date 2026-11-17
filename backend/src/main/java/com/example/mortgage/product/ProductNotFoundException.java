package com.example.mortgage.product;

/** Thrown when a product id does not exist (or has no current rate). Message carries no input values. */
public class ProductNotFoundException extends RuntimeException {

    public ProductNotFoundException() {
        super("product not found");
    }
}
