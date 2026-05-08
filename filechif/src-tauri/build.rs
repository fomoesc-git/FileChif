fn main() {
    println!("cargo:rustc-env=FILECHIF_BUILD_TIME=2026-05-09");
    println!("cargo:rustc-env=FILECHIF_RELEASE_CHANNEL=preview");
    tauri_build::build()
}
