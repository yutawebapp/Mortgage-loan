package com.example.mortgage.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.net.URI;
import java.util.List;
import java.util.Map;

/**
 * Converts errors to RFC 7807 ProblemDetail.
 * Input values are intentionally NOT logged or echoed back (except field names and messages).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        List<Map<String, String>> errors = ex.getBindingResult().getAllErrors().stream()
                .map(error -> Map.of(
                        "field", error instanceof FieldError fe ? fe.getField() : error.getObjectName(),
                        "message", String.valueOf(error.getDefaultMessage())))
                .toList();
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "入力値が不正です。");
        problem.setTitle("Validation failed");
        problem.setType(URI.create("about:blank"));
        problem.setProperty("errors", errors);
        return problem;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleUnreadableBody(HttpMessageNotReadableException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "リクエストボディを解釈できません。");
        problem.setTitle("Malformed request body");
        problem.setType(URI.create("about:blank"));
        return problem;
    }

    /** Path/query value cannot be converted (e.g. unknown enum name, non-numeric id). Value is not echoed. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "リクエストパラメータの形式が不正です。");
        problem.setTitle("Invalid parameter");
        problem.setType(URI.create("about:blank"));
        problem.setProperty("errors", List.of(Map.of(
                "field", String.valueOf(ex.getName()),
                "message", "形式が不正です。")));
        return problem;
    }

    /** Bean-validation constraints on @RequestParam (e.g. @Min/@Max) without class-level @Validated. */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ProblemDetail handleMethodValidation(HandlerMethodValidationException ex) {
        List<Map<String, String>> errors = ex.getParameterValidationResults().stream()
                .map(result -> Map.of(
                        "field", String.valueOf(result.getMethodParameter().getParameterName()),
                        "message", result.getResolvableErrors().isEmpty()
                                ? "値が不正です。"
                                : String.valueOf(result.getResolvableErrors().get(0).getDefaultMessage())))
                .toList();
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "入力値が不正です。");
        problem.setTitle("Validation failed");
        problem.setType(URI.create("about:blank"));
        problem.setProperty("errors", errors);
        return problem;
    }

    /** A value outside a whitelist (e.g. sort). Only the parameter name is returned. */
    @ExceptionHandler(InvalidQueryParameterException.class)
    public ProblemDetail handleInvalidQueryParameter(InvalidQueryParameterException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "リクエストパラメータの値が不正です。");
        problem.setTitle("Invalid parameter");
        problem.setType(URI.create("about:blank"));
        problem.setProperty("errors", List.of(Map.of(
                "field", ex.getParameter(),
                "message", "許可されていない値です。")));
        return problem;
    }
}
