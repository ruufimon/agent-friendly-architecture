package dev.sand.bank.api

fun baht(amount: Long): String = "฿%,d".format(amount)
