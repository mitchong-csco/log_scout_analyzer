// Jenkins Pipeline for Log Scout Analyzer
// Compatible with both Docker and Podman agents
// For Podman setup, see JENKINS_SETUP.md

pipeline {
    agent any

    environment {
        CARGO_HOME = "${WORKSPACE}/.cargo"
        RUSTUP_HOME = "${WORKSPACE}/.rustup"
        PATH = "${CARGO_HOME}/bin:${PATH}"
        PROJECT_NAME = "log-scout-analyzer"
        WASM_TARGET = "wasm32-wasi"
        ZED_EXTENSION_DIR = "${WORKSPACE}/dist"
        // Podman-specific: Use rootless mode by default
        CONTAINER_ENGINE = "podman"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    parameters {
        choice(
            name: 'BUILD_TYPE',
            choices: ['release', 'debug'],
            description: 'Build type: release (optimized) or debug'
        )
        booleanParam(
            name: 'RUN_TESTS',
            defaultValue: true,
            description: 'Run unit tests'
        )
        booleanParam(
            name: 'RUN_CLIPPY',
            defaultValue: true,
            description: 'Run Clippy linter'
        )
        booleanParam(
            name: 'RUN_FORMAT_CHECK',
            defaultValue: true,
            description: 'Check code formatting'
        )
        booleanParam(
            name: 'CREATE_ARTIFACT',
            defaultValue: true,
            description: 'Create and archive build artifacts'
        )
    }

    stages {
        stage('Environment Setup') {
            steps {
                script {
                    echo "=========================================="
                    echo "Log Scout Analyzer - Jenkins Pipeline"
                    echo "=========================================="
                    echo "Build Type: ${params.BUILD_TYPE}"
                    echo "Workspace: ${WORKSPACE}"
                    echo "Branch: ${env.GIT_BRANCH}"
                    echo "Commit: ${env.GIT_COMMIT}"
                    echo "Container Engine: ${env.CONTAINER_ENGINE}"
                    echo "=========================================="
                }
            }
        }

        stage('Install Rust') {
            when {
                expression {
                    return !fileExists("${CARGO_HOME}/bin/cargo")
                }
            }
            steps {
                echo "Installing Rust toolchain..."
                script {
                    if (isUnix()) {
                        sh '''
                            curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
                            source ${CARGO_HOME}/env
                            rustc --version
                            cargo --version
                        '''
                    } else {
                        bat '''
                            curl --proto =https --tlsv1.2 -sSf https://win.rustup.rs/x86_64 -o rustup-init.exe
                            rustup-init.exe -y --no-modify-path
                            del rustup-init.exe
                        '''
                    }
                }
            }
        }

        stage('Verify Rust Installation') {
            steps {
                echo "Verifying Rust installation..."
                script {
                    if (isUnix()) {
                        sh '''
                            source ${CARGO_HOME}/env
                            rustc --version
                            cargo --version
                            rustup --version
                        '''
                    } else {
                        bat '''
                            rustc --version
                            cargo --version
                            rustup --version
                        '''
                    }
                }
            }
        }

        stage('Add WASM Target') {
            steps {
                echo "Adding wasm32-wasi target..."
                script {
                    if (isUnix()) {
                        sh '''
                            source ${CARGO_HOME}/env
                            rustup target add ${WASM_TARGET}
                            rustup target list | grep ${WASM_TARGET}
                        '''
                    } else {
                        bat '''
                            rustup target add %WASM_TARGET%
                            rustup target list | findstr %WASM_TARGET%
                        '''
                    }
                }
            }
        }

        stage('Dependencies') {
            steps {
                echo "Fetching dependencies..."
                script {
                    if (isUnix()) {
                        sh '''
                            source ${CARGO_HOME}/env
                            cargo fetch
                        '''
                    } else {
                        bat 'cargo fetch'
                    }
                }
            }
        }

        stage('Code Format Check') {
            when {
                expression { params.RUN_FORMAT_CHECK }
            }
            steps {
                echo "Checking code formatting..."
                script {
                    if (isUnix()) {
                        sh '''
                            source ${CARGO_HOME}/env
                            cargo fmt -- --check || {
                                echo "Code formatting issues found. Run 'cargo fmt' to fix."
                                exit 1
                            }
                        '''
                    } else {
                        bat '''
                            cargo fmt -- --check || (
                                echo Code formatting issues found. Run 'cargo fmt' to fix.
                                exit /b 1
                            )
                        '''
                    }
                }
            }
        }

        stage('Clippy Linting') {
            when {
                expression { params.RUN_CLIPPY }
            }
            steps {
                echo "Running Clippy linter..."
                script {
                    if (isUnix()) {
                        sh '''
                            source ${CARGO_HOME}/env
                            cargo clippy --all-targets --all-features -- -D warnings
                        '''
                    } else {
                        bat 'cargo clippy --all-targets --all-features -- -D warnings'
                    }
                }
            }
        }

        stage('Unit Tests') {
            when {
                expression { params.RUN_TESTS }
            }
            steps {
                echo "Running unit tests..."
                script {
                    if (isUnix()) {
                        sh '''
                            source ${CARGO_HOME}/env
                            cargo test --verbose -- --nocapture
                        '''
                    } else {
                        bat 'cargo test --verbose -- --nocapture'
                    }
                }
            }
            post {
                always {
                    // Archive test results if available
                    junit allowEmptyResults: true, testResults: 'target/test-results/*.xml'
                }
            }
        }

        stage('Build Extension') {
            steps {
                echo "Building ${PROJECT_NAME} for WASM..."
                script {
                    def buildFlag = params.BUILD_TYPE == 'release' ? '--release' : ''

                    if (isUnix()) {
                        sh """
                            source \${CARGO_HOME}/env
                            cargo build ${buildFlag} --target \${WASM_TARGET} --verbose
                        """
                    } else {
                        bat """
                            cargo build ${buildFlag} --target %WASM_TARGET% --verbose
                        """
                    }
                }
            }
        }

        stage('Verify Build Artifacts') {
            steps {
                echo "Verifying build artifacts..."
                script {
                    def buildDir = params.BUILD_TYPE == 'release' ? 'release' : 'debug'
                    def wasmFile = "target/${WASM_TARGET}/${buildDir}/${PROJECT_NAME}.wasm"

                    if (isUnix()) {
                        sh """
                            if [ -f "${wasmFile}" ]; then
                                echo "✓ WASM file found: ${wasmFile}"
                                ls -lh "${wasmFile}"
                                file "${wasmFile}"
                            else
                                echo "✗ WASM file not found: ${wasmFile}"
                                exit 1
                            fi
                        """
                    } else {
                        bat """
                            if exist "${wasmFile}" (
                                echo ✓ WASM file found: ${wasmFile}
                                dir "${wasmFile}"
                            ) else (
                                echo ✗ WASM file not found: ${wasmFile}
                                exit /b 1
                            )
                        """
                    }
                }
            }
        }

        stage('Package Extension') {
            when {
                expression { params.CREATE_ARTIFACT }
            }
            steps {
                echo "Packaging extension..."
                script {
                    def buildDir = params.BUILD_TYPE == 'release' ? 'release' : 'debug'
                    def wasmFile = "target/${WASM_TARGET}/${buildDir}/${PROJECT_NAME}.wasm"

                    if (isUnix()) {
                        sh """
                            mkdir -p ${ZED_EXTENSION_DIR}/${PROJECT_NAME}
                            cp ${wasmFile} ${ZED_EXTENSION_DIR}/${PROJECT_NAME}/
                            cp extension.toml ${ZED_EXTENSION_DIR}/${PROJECT_NAME}/
                            cp -r config ${ZED_EXTENSION_DIR}/${PROJECT_NAME}/
                            cp README.md ${ZED_EXTENSION_DIR}/${PROJECT_NAME}/
                            cp LICENSE ${ZED_EXTENSION_DIR}/${PROJECT_NAME}/

                            # Create version file
                            echo "Build: ${BUILD_NUMBER}" > ${ZED_EXTENSION_DIR}/${PROJECT_NAME}/BUILD_INFO.txt
                            echo "Commit: ${GIT_COMMIT}" >> ${ZED_EXTENSION_DIR}/${PROJECT_NAME}/BUILD_INFO.txt
                            echo "Branch: ${GIT_BRANCH}" >> ${ZED_EXTENSION_DIR}/${PROJECT_NAME}/BUILD_INFO.txt
                            echo "Date: \$(date)" >> ${ZED_EXTENSION_DIR}/${PROJECT_NAME}/BUILD_INFO.txt

                            # Create archive
                            cd ${ZED_EXTENSION_DIR}
                            tar -czf ${PROJECT_NAME}-${BUILD_NUMBER}.tar.gz ${PROJECT_NAME}/
                            ls -lh ${PROJECT_NAME}-${BUILD_NUMBER}.tar.gz
                        """
                    } else {
                        bat """
                            if not exist ${ZED_EXTENSION_DIR}\\${PROJECT_NAME} mkdir ${ZED_EXTENSION_DIR}\\${PROJECT_NAME}
                            copy ${wasmFile} ${ZED_EXTENSION_DIR}\\${PROJECT_NAME}\\
                            copy extension.toml ${ZED_EXTENSION_DIR}\\${PROJECT_NAME}\\
                            xcopy /E /I /Y config ${ZED_EXTENSION_DIR}\\${PROJECT_NAME}\\config
                            copy README.md ${ZED_EXTENSION_DIR}\\${PROJECT_NAME}\\
                            copy LICENSE ${ZED_EXTENSION_DIR}\\${PROJECT_NAME}\\

                            echo Build: ${BUILD_NUMBER} > ${ZED_EXTENSION_DIR}\\${PROJECT_NAME}\\BUILD_INFO.txt
                            echo Commit: ${GIT_COMMIT} >> ${ZED_EXTENSION_DIR}\\${PROJECT_NAME}\\BUILD_INFO.txt
                            echo Branch: ${GIT_BRANCH} >> ${ZED_EXTENSION_DIR}\\${PROJECT_NAME}\\BUILD_INFO.txt
                            echo Date: %date% %time% >> ${ZED_EXTENSION_DIR}\\${PROJECT_NAME}\\BUILD_INFO.txt

                            cd ${ZED_EXTENSION_DIR}
                            tar -czf ${PROJECT_NAME}-${BUILD_NUMBER}.tar.gz ${PROJECT_NAME}
                            dir ${PROJECT_NAME}-${BUILD_NUMBER}.tar.gz
                        """
                    }
                }
            }
        }

        stage('Archive Artifacts') {
            when {
                expression { params.CREATE_ARTIFACT }
            }
            steps {
                echo "Archiving build artifacts..."
                archiveArtifacts artifacts: "dist/${PROJECT_NAME}-*.tar.gz", fingerprint: true
                archiveArtifacts artifacts: "dist/${PROJECT_NAME}/**/*", fingerprint: true
            }
        }

        stage('Generate Documentation') {
            steps {
                echo "Generating Rust documentation..."
                script {
                    if (isUnix()) {
                        sh '''
                            source ${CARGO_HOME}/env
                            cargo doc --no-deps --document-private-items
                        '''
                    } else {
                        bat 'cargo doc --no-deps --document-private-items'
                    }
                }

                // Publish HTML documentation
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'target/doc',
                    reportFiles: 'log_scout_analyzer/index.html',
                    reportName: 'Rust Documentation'
                ])
            }
        }

        stage('Security Audit') {
            steps {
                echo "Running security audit..."
                script {
                    if (isUnix()) {
                        sh '''
                            source ${CARGO_HOME}/env
                            # Install cargo-audit if not present
                            cargo install --quiet cargo-audit || true
                            # Run security audit (non-blocking)
                            cargo audit || echo "⚠ Security audit found issues (non-blocking)"
                        '''
                    } else {
                        bat '''
                            cargo install --quiet cargo-audit || echo Cargo audit already installed
                            cargo audit || echo Security audit found issues (non-blocking)
                        '''
                    }
                }
            }
        }

        stage('Performance Check') {
            when {
                expression { params.BUILD_TYPE == 'release' }
            }
            steps {
                echo "Checking binary size..."
                script {
                    def wasmFile = "target/${WASM_TARGET}/release/${PROJECT_NAME}.wasm"

                    if (isUnix()) {
                        sh """
                            SIZE=\$(stat -f%z "${wasmFile}" 2>/dev/null || stat -c%s "${wasmFile}" 2>/dev/null)
                            SIZE_MB=\$(echo "scale=2; \$SIZE / 1024 / 1024" | bc)
                            echo "WASM file size: \${SIZE_MB} MB"

                            if (( \$(echo "\$SIZE_MB > 10" | bc -l) )); then
                                echo "⚠ Warning: WASM file is larger than 10MB"
                            fi
                        """
                    } else {
                        bat """
                            for %%A in ("${wasmFile}") do set SIZE=%%~zA
                            set /a SIZE_MB=%SIZE% / 1024 / 1024
                            echo WASM file size: %SIZE_MB% MB
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "=========================================="
            echo "✓ Build completed successfully!"
            echo "=========================================="
            script {
                if (params.CREATE_ARTIFACT) {
                    echo "Artifacts available at: ${BUILD_URL}artifact/"
                }
                echo "Documentation: ${BUILD_URL}Rust_Documentation/"
                echo ""
                echo "Next steps:"
                echo "1. Download artifacts from Jenkins"
                echo "2. Extract and install to Zed extensions directory"
                echo "3. Restart Zed editor"
            }
        }

        failure {
            echo "=========================================="
            echo "✗ Build failed!"
            echo "=========================================="
            echo "Check the console output for details: ${BUILD_URL}console"
            echo ""
            echo "Common issues:"
            echo "- Rust not installed: Run setup stage"
            echo "- WASM target missing: rustup target add wasm32-wasi"
            echo "- Test failures: Check test output above"
        }

        always {
            echo "Cleaning up workspace..."
            // Clean up build artifacts but keep cargo cache for speed
            script {
                if (isUnix()) {
                    sh 'cargo clean || true'
                } else {
                    bat 'cargo clean || exit 0'
                }
            }

            // Optional: Send notifications
            // Uncomment and configure as needed:
            // emailext body: "Build ${env.BUILD_NUMBER} - ${currentBuild.currentResult}",
            //          subject: "${env.JOB_NAME} - Build ${env.BUILD_NUMBER}",
            //          to: 'team@example.com'

            // Slack notification example:
            // slackSend color: currentBuild.currentResult == 'SUCCESS' ? 'good' : 'danger',
            //           message: "Build ${env.BUILD_NUMBER}: ${currentBuild.currentResult}"
        }
    }
}

// Pipeline Notes:
// - This pipeline works with both Docker and Podman agents
// - For Podman setup, see podman-compose.yml and JENKINS_SETUP.md
// - Cargo cache is preserved between builds for performance
// - WASM target is required and added automatically if missing
