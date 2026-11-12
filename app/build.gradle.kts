plugins {
    application
}

dependencies {
    implementation(project(":dune"))
    implementation(project(":bank-api"))

    // Rule 4: features are found by folder and loaded at runtime only.
    // Adding a feature never means editing this file.
    rootDir.resolve("features")
        .listFiles { file -> file.isDirectory && file.resolve("src").isDirectory }
        ?.sortedBy { it.name }
        ?.forEach { runtimeOnly(project(":features:${it.name}")) }
}

application {
    mainClass = "dev.sand.app.MainKt"
}
