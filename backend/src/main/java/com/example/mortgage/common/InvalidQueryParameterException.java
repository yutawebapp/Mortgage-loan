package com.example.mortgage.common;

/** A query parameter has a value outside its whitelist. Carries only the parameter name. */
public class InvalidQueryParameterException extends RuntimeException {

    private final String parameter;

    public InvalidQueryParameterException(String parameter) {
        super("invalid query parameter");
        this.parameter = parameter;
    }

    public String getParameter() {
        return parameter;
    }
}
