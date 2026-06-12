allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// Force all subprojects (including plugins like file_picker) to compile
// against SDK 36, satisfying flutter_plugin_android_lifecycle's requirement.
subprojects {
    afterEvaluate {
        if (extensions.findByName("android") != null) {
            extensions.getByType(com.android.build.gradle.BaseExtension::class).apply {
                compileSdkVersion(36)
            }
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
