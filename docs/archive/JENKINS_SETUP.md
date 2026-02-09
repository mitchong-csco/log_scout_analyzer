# Jenkins Setup Guide for Log Scout Analyzer

Complete guide for setting up Jenkins CI/CD pipeline for automated building, testing, and deployment of the Log Scout Analyzer extension.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Jenkins Installation](#jenkins-installation)
- [Initial Jenkins Configuration](#initial-jenkins-configuration)
- [Pipeline Setup](#pipeline-setup)
- [Pipeline Configuration](#pipeline-configuration)
- [Running Builds](#running-builds)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

### Required Software

- **Jenkins** (2.400+)
- **Git** (for repository access)
- **Java** (11 or 17 for Jenkins)
- **Network access** to download Rust toolchain

### Optional But Recommended

- **Docker** (for containerized builds)
- **Blue Ocean plugin** (better pipeline visualization)
- **Slack/Email** integration (for notifications)

---

## Jenkins Installation

### Windows

1. **Download Jenkins:**
   ```cmd
   # Download from https://www.jenkins.io/download/
   # Or use chocolatey:
   choco install jenkins
   ```

2. **Start Jenkins:**
   ```cmd
   # As a service (automatically starts)
   # Or manually:
   java -jar jenkins.war
   ```

3. **Access Jenkins:**
   - Open browser: `http://localhost:8080`
   - Initial admin password: `C:\Program Files\Jenkins\secrets\initialAdminPassword`

### Mac

1. **Install via Homebrew:**
   ```bash
   brew install jenkins-lts
   ```

2. **Start Jenkins:**
   ```bash
   brew services start jenkins-lts
   ```

3. **Access Jenkins:**
   - Open browser: `http://localhost:8080`
   - Initial password: `/Users/[username]/.jenkins/secrets/initialAdminPassword`

### Linux

1. **Install Jenkins:**
   ```bash
   # Ubuntu/Debian
   wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io.key | sudo apt-key add -
   sudo sh -c 'echo deb https://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'
   sudo apt-get update
   sudo apt-get install jenkins

   # RedHat/CentOS
   sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
   sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key
   sudo yum install jenkins
   ```

2. **Start Jenkins:**
   ```bash
   sudo systemctl start jenkins
   sudo systemctl enable jenkins
   ```

3. **Access Jenkins:**
   - Open browser: `http://localhost:8080`
   - Initial password: `/var/lib/jenkins/secrets/initialAdminPassword`

### Docker (Recommended for Testing)

```bash
# Run Jenkins in Docker
docker run -d \
  --name jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts

# Get initial admin password
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

---

## Initial Jenkins Configuration

### 1. Unlock Jenkins

1. Copy the initial admin password
2. Paste it into the web interface
3. Click "Continue"

### 2. Install Suggested Plugins

Choose "Install suggested plugins" - this includes:
- Git plugin
- Pipeline plugin
- Credentials plugin
- Workspace Cleanup plugin
- Timestamper plugin

### 3. Install Additional Required Plugins

Go to **Manage Jenkins** → **Manage Plugins** → **Available**, search and install:

- ✅ **Pipeline** (should be installed)
- ✅ **Git** (should be installed)
- ✅ **Blue Ocean** (optional, better UI)
- ✅ **HTML Publisher** (for documentation)
- ✅ **JUnit** (for test results)
- ✅ **Slack Notification** (optional)
- ✅ **Email Extension** (optional)

### 4. Create Admin User

1. Enter username, password, email
2. Click "Save and Continue"
3. Confirm Jenkins URL
4. Click "Start using Jenkins"

---

## Pipeline Setup

### Method 1: Pipeline from SCM (Recommended)

This method reads the `Jenkinsfile` directly from your repository.

1. **Create New Item:**
   - Click "New Item"
   - Enter name: `log-scout-analyzer`
   - Select "Pipeline"
   - Click OK

2. **Configure Pipeline:**
   - **General:**
     - ✅ Discard old builds (keep last 10)
     - ✅ This project is parameterized (optional)
   
   - **Pipeline:**
     - Definition: `Pipeline script from SCM`
     - SCM: `Git`
     - Repository URL: `https://github.com/yourusername/log-scout-analyzer.git`
     - Credentials: (add if private repo)
     - Branch: `*/main` or `*/master`
     - Script Path: `Jenkinsfile`

3. **Save**

### Method 2: Pipeline Script (Quick Test)

1. **Create New Item** (same as above)

2. **Configure Pipeline:**
   - Definition: `Pipeline script`
   - Copy and paste the entire `Jenkinsfile` content

3. **Save**

---

## Pipeline Configuration

### Understanding the Pipeline Parameters

When you run the pipeline, you can configure:

| Parameter | Options | Description |
|-----------|---------|-------------|
| BUILD_TYPE | release, debug | Optimization level |
| RUN_TESTS | true, false | Execute unit tests |
| RUN_CLIPPY | true, false | Run Rust linter |
| RUN_FORMAT_CHECK | true, false | Verify code formatting |
| CREATE_ARTIFACT | true, false | Package and archive |

### Pipeline Stages

The pipeline executes these stages:

1. **Environment Setup** - Display build info
2. **Install Rust** - Install Rust toolchain (if needed)
3. **Verify Rust Installation** - Confirm Rust works
4. **Add WASM Target** - Add wasm32-wasi target
5. **Dependencies** - Fetch Cargo dependencies
6. **Code Format Check** - Verify code style
7. **Clippy Linting** - Run Rust linter
8. **Unit Tests** - Run all tests
9. **Build Extension** - Compile to WASM
10. **Verify Build Artifacts** - Confirm WASM file exists
11. **Package Extension** - Create distributable package
12. **Archive Artifacts** - Save to Jenkins
13. **Generate Documentation** - Build Rust docs
14. **Security Audit** - Check dependencies
15. **Performance Check** - Verify binary size

---

## Running Builds

### Manual Build

1. Go to your pipeline job
2. Click "Build with Parameters"
3. Select desired options
4. Click "Build"

### Automatic Builds

#### Trigger on Git Push

Add to your pipeline configuration:

```groovy
triggers {
    pollSCM('H/5 * * * *')  // Check for changes every 5 minutes
}
```

Or use webhook (recommended):

1. In Jenkins: Get webhook URL from job configuration
2. In GitHub: Settings → Webhooks → Add webhook
3. Payload URL: `http://your-jenkins:8080/github-webhook/`
4. Content type: `application/json`
5. Events: "Just the push event"

#### Scheduled Builds

```groovy
triggers {
    cron('H 2 * * *')  // Build every night at 2 AM
}
```

### Build Monitoring

- **Console Output:** Real-time build logs
- **Blue Ocean:** Visual pipeline view
- **Build History:** See past builds
- **Artifacts:** Download built packages

---

## Build Artifacts

After successful build, artifacts are available at:

```
{Jenkins URL}/job/{job-name}/{build-number}/artifact/
```

**Artifacts Include:**
- `log-scout-analyzer.tar.gz` - Complete extension package
- WASM binary
- Configuration files
- Documentation
- BUILD_INFO.txt with version details

### Installing Built Extension

```bash
# Download artifact
curl -O http://jenkins-server:8080/job/log-scout-analyzer/lastSuccessfulBuild/artifact/dist/log-scout-analyzer-*.tar.gz

# Extract and install
tar -xzf log-scout-analyzer-*.tar.gz
cp -r log-scout-analyzer/* ~/.config/zed/extensions/log-scout-analyzer/

# Restart Zed
```

---

## Troubleshooting

### Common Issues

#### 1. Rust Installation Fails

**Problem:** "curl: command not found" or download fails

**Solution:**
```groovy
// Add to pipeline environment:
environment {
    RUSTUP_INIT_SKIP_PATH_CHECK = 'yes'
}
```

Or manually install Rust on Jenkins agent:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

#### 2. WASM Target Not Found

**Problem:** "error: no such target: wasm32-wasi"

**Solution:**
```bash
# On Jenkins agent
rustup target add wasm32-wasi
```

#### 3. Permission Denied

**Problem:** Jenkins can't write to workspace

**Solution:**
```bash
# Linux: Give Jenkins user permissions
sudo chown -R jenkins:jenkins /var/lib/jenkins/workspace

# Or run Jenkins as different user
sudo systemctl edit jenkins
# Add:
[Service]
User=your-user
```

#### 4. Build Timeout

**Problem:** "Build timed out"

**Solution:**
```groovy
options {
    timeout(time: 60, unit: 'MINUTES')  // Increase timeout
}
```

#### 5. Cargo Cache Issues

**Problem:** "failed to write output"

**Solution:**
```groovy
// Clean cargo cache
stage('Clean Cache') {
    steps {
        sh 'rm -rf ${CARGO_HOME}/registry/cache'
    }
}
```

### Debugging Tips

1. **Check Console Output:**
   - Click on build number
   - Click "Console Output"
   - Look for error messages

2. **Enable Verbose Logging:**
   ```groovy
   sh 'cargo build --verbose'
   ```

3. **Test Locally:**
   ```bash
   # Clone the repo
   # Run the same commands as Jenkins
   cargo build --release --target wasm32-wasi
   ```

4. **Check Jenkins Logs:**
   ```bash
   # Linux
   sudo journalctl -u jenkins -f
   
   # Docker
   docker logs jenkins
   ```

---

## Advanced Configuration

### Multi-Branch Pipeline

For multiple branches (dev, staging, production):

1. **Create Multi-branch Pipeline:**
   - New Item → Multibranch Pipeline
   - Branch Sources: Git
   - Behaviors: Discover branches

2. **Branch-Specific Configuration:**
   ```groovy
   // In Jenkinsfile
   stage('Deploy') {
       when {
           branch 'production'
       }
       steps {
           // Deploy to production
       }
   }
   ```

### Docker Agent

Use Docker for isolated builds:

```groovy
pipeline {
    agent {
        docker {
            image 'rust:latest'
            args '-v cargo-cache:/usr/local/cargo'
        }
    }
    // ... rest of pipeline
}
```

### Parallel Stages

Run tests in parallel:

```groovy
stage('Parallel Tests') {
    parallel {
        stage('Unit Tests') {
            steps {
                sh 'cargo test --lib'
            }
        }
        stage('Integration Tests') {
            steps {
                sh 'cargo test --test integration'
            }
        }
        stage('Doc Tests') {
            steps {
                sh 'cargo test --doc'
            }
        }
    }
}
```

### Notifications

#### Slack Integration

```groovy
post {
    success {
        slackSend(
            color: 'good',
            message: "Build ${env.BUILD_NUMBER} succeeded! ${env.BUILD_URL}"
        )
    }
    failure {
        slackSend(
            color: 'danger',
            message: "Build ${env.BUILD_NUMBER} failed! ${env.BUILD_URL}"
        )
    }
}
```

#### Email Notifications

```groovy
post {
    always {
        emailext(
            subject: "Build ${env.BUILD_NUMBER} - ${currentBuild.currentResult}",
            body: """
                Job: ${env.JOB_NAME}
                Build: ${env.BUILD_NUMBER}
                Status: ${currentBuild.currentResult}
                URL: ${env.BUILD_URL}
            """,
            to: 'team@example.com'
        )
    }
}
```

### Credentials Management

Store sensitive data securely:

1. **Add Credentials:**
   - Manage Jenkins → Manage Credentials
   - Add new credentials (username/password, SSH key, etc.)

2. **Use in Pipeline:**
   ```groovy
   environment {
       GIT_CREDS = credentials('github-credentials-id')
   }
   ```

### Matrix Builds

Test on multiple platforms:

```groovy
matrix {
    axes {
        axis {
            name 'PLATFORM'
            values 'linux', 'windows', 'macos'
        }
    }
    stages {
        stage('Build') {
            steps {
                sh "cargo build --target ${PLATFORM}-target"
            }
        }
    }
}
```

---

## Best Practices

### 1. Use Declarative Pipeline
- Easier to read and maintain
- Better error handling
- Built-in syntax validation

### 2. Cache Dependencies
```groovy
environment {
    CARGO_HOME = "${WORKSPACE}/.cargo"  // Workspace-specific cache
}
```

### 3. Fail Fast
```groovy
options {
    skipDefaultCheckout()  // Manual checkout
    disableConcurrentBuilds()  // One build at a time
}
```

### 4. Separate Build and Deploy
- Build artifacts once
- Deploy to multiple environments
- Use different pipelines for each stage

### 5. Version Everything
- Tag successful builds
- Include build info in artifacts
- Track dependencies

### 6. Monitor Build Times
- Keep builds under 10 minutes
- Use parallel stages
- Cache aggressively

---

## Security Considerations

### 1. Secure Jenkins
- Enable CSRF protection
- Use matrix-based security
- Regular security updates

### 2. Isolate Builds
- Use Docker containers
- Limit workspace access
- Clean after builds

### 3. Protect Credentials
- Never hardcode secrets
- Use Jenkins credentials store
- Rotate regularly

### 4. Audit Dependencies
```groovy
stage('Security Audit') {
    steps {
        sh 'cargo audit'
    }
}
```

---

## Performance Optimization

### 1. Cargo Cache
```groovy
environment {
    CARGO_HOME = "/var/cache/jenkins/cargo"
}
```

### 2. Incremental Builds
```groovy
environment {
    CARGO_INCREMENTAL = "1"
}
```

### 3. Parallel Compilation
```groovy
environment {
    CARGO_BUILD_JOBS = "4"
}
```

### 4. Workspace Cleanup
```groovy
post {
    cleanup {
        cleanWs()  // Clean workspace after build
    }
}
```

---

## Monitoring and Reporting

### Build Status Badge

Add to your README.md:
```markdown
![Build Status](http://jenkins-server:8080/buildStatus/icon?job=log-scout-analyzer)
```

### Metrics to Track

- Build success rate
- Build duration
- Test coverage
- Binary size trends
- Dependency vulnerabilities

### Dashboards

Use Jenkins Dashboard View plugin to create custom dashboards showing:
- Recent builds
- Test results
- Code coverage
- Build trends

---

## Migration from Local Builds

### Transition Plan

1. **Week 1:** Set up Jenkins, run test builds
2. **Week 2:** Parallel local and Jenkins builds
3. **Week 3:** Jenkins primary, local backup
4. **Week 4:** Jenkins only, remove local scripts

### Validation Checklist

- [ ] Jenkins accessible to team
- [ ] All builds passing
- [ ] Artifacts downloadable
- [ ] Documentation generated
- [ ] Notifications working
- [ ] Performance acceptable
- [ ] Team trained on Jenkins

---

## Support and Resources

### Jenkins Resources
- **Official Docs:** https://www.jenkins.io/doc/
- **Pipeline Syntax:** https://www.jenkins.io/doc/book/pipeline/syntax/
- **Plugins:** https://plugins.jenkins.io/

### Rust CI/CD Resources
- **Cargo Book:** https://doc.rust-lang.org/cargo/
- **Rust CI Examples:** https://github.com/rust-lang/rust/blob/master/.github/workflows/ci.yml

### Getting Help
- Jenkins community: https://community.jenkins.io/
- Stack Overflow: `[jenkins]` tag
- GitHub Issues: Project repository

---

## Quick Reference

### Essential Jenkins Commands

```bash
# Restart Jenkins
sudo systemctl restart jenkins

# Check Jenkins status
sudo systemctl status jenkins

# View Jenkins logs
sudo journalctl -u jenkins -f

# Backup Jenkins
tar -czf jenkins-backup.tar.gz /var/lib/jenkins/

# Restore Jenkins
tar -xzf jenkins-backup.tar.gz -C /
```

### Pipeline Snippet Generator

Access at: `http://jenkins-server:8080/pipeline-syntax/`

Generates Groovy code for common tasks.

---

## Conclusion

You now have a complete Jenkins CI/CD pipeline for Log Scout Analyzer that:

✅ Automatically installs dependencies
✅ Runs tests and linting
✅ Builds optimized WASM binaries
✅ Generates documentation
✅ Archives artifacts
✅ Provides build notifications

The pipeline makes it easy for your team to build and deploy the extension without worrying about local development environment setup!

---

**Need Help?** Check the troubleshooting section or consult the Jenkins documentation.

**Happy Building! 🚀**