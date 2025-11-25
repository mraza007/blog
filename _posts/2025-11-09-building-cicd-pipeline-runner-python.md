---
layout: post
title: "Building a CI/CD Pipeline Runner from Scratch in Python"
description: "Understanding how GitLab Runner and GitHub Actions work by building a complete CI/CD pipeline runner in Python with parallel execution, dependencies, and artifacts"
keywords: "python cicd devops gitlab-runner github-actions pipelines automation systems-programming"
tags: [python, devops]
comments: true
---

I've been using CI/CD pipelines for years now - GitLab CI, GitHub Actions, Jenkins, you name it. Like most developers, I treated them as configuration files that "just work." You write a YAML file, push it, and somehow your code gets built, tested, and deployed. But I never really understood what was happening behind the scenes.

That changed when I needed to set up CI/CD for an air-gapped environment at work - no access to GitHub Actions or GitLab's hosted runners. I needed to understand how these tools actually work under the hood so I could build something custom. That's when I realized: pipeline runners are just orchestration tools that execute jobs in isolated environments.

In this post, I'll show you how to build a complete CI/CD pipeline runner from scratch in Python. We'll implement the core features you use every day: stages, parallel execution, job dependencies, and artifact passing. By the end, you'll understand exactly how GitLab Runner and GitHub Actions work internally.

## What Actually IS a CI/CD Pipeline?

Before we start coding, let's understand what a CI/CD pipeline actually does.

A **CI/CD pipeline** is an automated workflow that takes your code from commit to deployment. It's defined as a series of **jobs** organized into **stages**:

```yaml
stages:
  - build
  - test
  - deploy

build-job:
  stage: build
  script:
    - python -m build

test-job:
  stage: test
  script:
    - pytest tests/

deploy-job:
  stage: deploy
  script:
    - ./deploy.sh
```

When you push code, a **pipeline runner** (like GitLab Runner or GitHub Actions) does this:

1. **Parses** the pipeline configuration file
2. **Creates a dependency graph** of jobs
3. **Executes jobs** in isolated environments (usually containers)
4. **Streams logs** back to you in real-time
5. **Passes artifacts** between jobs
6. **Reports** success or failure

The key insight: **a pipeline runner is just a job orchestrator**. It figures out what to run, in what order, and handles the execution.

Let's build one ourselves.

## Understanding Pipeline Components

Every pipeline has three main components:

### 1. Stages
Stages define the execution order. Jobs in the same stage can run in parallel, but stages run sequentially:

```
Stage 1: build     → Stage 2: test        → Stage 3: deploy
  [build-app]        [unit-test]             [deploy-prod]
                     [integration-test]
```

### 2. Jobs
Jobs are the actual work units. Each job:
- Runs in an isolated environment (container)
- Executes a series of shell commands
- Can depend on other jobs
- Can produce artifacts for other jobs

### 3. Artifacts
Artifacts are files produced by one job that other jobs need. For example:
- Build job produces `dist/` folder
- Test jobs need `dist/` to run tests
- Deploy job needs `dist/` to deploy

Now that we understand the concepts, let's start building.

## Building Our Pipeline Runner

### Version 1: Single Job Executor

Let's start with the absolute basics - executing a single job in a Docker container:

```python
#!/usr/bin/env python3
"""
Pipeline Runner v1: Single job executor
Executes one job in a Docker container and streams logs
"""

import yaml
import subprocess
import sys
from pathlib import Path


class Job:
    """Represents a single pipeline job."""

    def __init__(self, name, config):
        self.name = name
        self.image = config.get('image', 'python:3.11')
        self.script = config.get('script', [])
        self.stage = config.get('stage', 'test')

    def __repr__(self):
        return f"Job({self.name}, stage={self.stage})"


class JobExecutor:
    """Executes a job in a Docker container."""

    def __init__(self, workspace):
        self.workspace = Path(workspace).resolve()

    def run(self, job):
        """Execute a job and stream output."""
        print(f"\n{'='*60}")
        print(f"[{job.name}] Starting job...")
        print(f"[{job.name}] Image: {job.image}")
        print(f"[{job.name}] Stage: {job.stage}")
        print(f"{'='*60}\n")

        # Combine all script commands into one shell command
        script = ' && '.join(job.script)

        # Build docker run command
        cmd = [
            'docker', 'run',
            '--rm',  # Remove container after execution
            '-v', f'{self.workspace}:/workspace',  # Mount workspace
            '-w', '/workspace',  # Set working directory
            job.image,
            'sh', '-c', script
        ]

        try:
            # Run and stream output in real-time
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )

            # Stream output line by line
            for line in process.stdout:
                print(f"[{job.name}] {line}", end='')

            process.wait()

            if process.returncode == 0:
                print(f"\n[{job.name}] ✓ Job completed successfully\n")
                return True
            else:
                print(f"\n[{job.name}] ✗ Job failed with exit code {process.returncode}\n")
                return False

        except Exception as e:
            print(f"\n[{job.name}] ✗ Error: {e}\n")
            return False


class Pipeline:
    """Represents a pipeline with jobs."""

    def __init__(self, config_file):
        self.config_file = Path(config_file)
        self.config = self._load_config()
        self.jobs = self._parse_jobs()

    def _load_config(self):
        """Load and parse YAML configuration."""
        with open(self.config_file) as f:
            return yaml.safe_load(f)

    def _parse_jobs(self):
        """Parse jobs from configuration."""
        jobs = []
        for job_name, job_config in self.config.items():
            if job_name != 'stages' and isinstance(job_config, dict):
                jobs.append(Job(job_name, job_config))
        return jobs

    def run(self, workspace='.'):
        """Execute all jobs sequentially."""
        print(f"\nStarting pipeline from {self.config_file}")
        print(f"Found {len(self.jobs)} job(s)\n")

        executor = JobExecutor(workspace)

        for job in self.jobs:
            success = executor.run(job)
            if not success:
                print("Pipeline failed!")
                return False

        print("✓ Pipeline completed successfully!")
        return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python runner_v1.py <pipeline.yml>")
        sys.exit(1)

    pipeline = Pipeline(sys.argv[1])
    success = pipeline.run()
    sys.exit(0 if success else 1)
```

#### Testing Version 1

Create a simple pipeline config:

```yaml
# pipeline.yml
build-job:
  image: python:3.11
  script:
    - echo "Building application..."
    - python --version
    - pip install --quiet build
    - echo "Build complete!"
```

Run it:

```bash
python runner_v1.py pipeline.yml
```

You should see output like:

```
Starting pipeline from pipeline.yml
Found 1 job(s)

============================================================
[build-job] Starting job...
[build-job] Image: python:3.11
[build-job] Stage: test
============================================================

[build-job] Building application...
[build-job] Python 3.11.9
[build-job] Build complete!

[build-job] ✓ Job completed successfully

✓ Pipeline completed successfully!
```

Great! We can execute a single job. But real pipelines have multiple stages. Let's add that.

### Version 2: Multi-Stage Pipeline with Sequential Execution

Now let's add support for stages. Jobs in different stages should run in order:

```python
#!/usr/bin/env python3
"""
Pipeline Runner v2: Multi-stage support
Executes jobs stage by stage in sequential order
"""

import yaml
import subprocess
import sys
from pathlib import Path
from collections import defaultdict


class Job:
    """Represents a single pipeline job."""

    def __init__(self, name, config):
        self.name = name
        self.image = config.get('image', 'python:3.11')
        self.script = config.get('script', [])
        self.stage = config.get('stage', 'test')

    def __repr__(self):
        return f"Job({self.name}, stage={self.stage})"


class JobExecutor:
    """Executes a job in a Docker container."""

    def __init__(self, workspace):
        self.workspace = Path(workspace).resolve()

    def run(self, job):
        """Execute a job and stream output."""
        print(f"[{job.name}] Starting job...")

        script = ' && '.join(job.script)

        cmd = [
            'docker', 'run', '--rm',
            '-v', f'{self.workspace}:/workspace',
            '-w', '/workspace',
            job.image,
            'sh', '-c', script
        ]

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )

            for line in process.stdout:
                print(f"[{job.name}] {line}", end='')

            process.wait()

            if process.returncode == 0:
                print(f"[{job.name}] ✓ Job completed successfully")
                return True
            else:
                print(f"[{job.name}] ✗ Job failed with exit code {process.returncode}")
                return False

        except Exception as e:
            print(f"[{job.name}] ✗ Error: {e}")
            return False


class Pipeline:
    """Represents a pipeline with stages and jobs."""

    def __init__(self, config_file):
        self.config_file = Path(config_file)
        self.config = self._load_config()
        self.stages = self.config.get('stages', ['test'])
        self.jobs = self._parse_jobs()

    def _load_config(self):
        """Load and parse YAML configuration."""
        with open(self.config_file) as f:
            return yaml.safe_load(f)

    def _parse_jobs(self):
        """Parse jobs from configuration."""
        jobs = []
        for job_name, job_config in self.config.items():
            if job_name != 'stages' and isinstance(job_config, dict):
                jobs.append(Job(job_name, job_config))
        return jobs

    def _group_jobs_by_stage(self):
        """Group jobs by their stage."""
        stages = defaultdict(list)
        for job in self.jobs:
            stages[job.stage].append(job)
        return stages

    def run(self, workspace='.'):
        """Execute pipeline stage by stage."""
        print(f"\n{'='*60}")
        print(f"Starting pipeline: {self.config_file.name}")
        print(f"Stages: {' → '.join(self.stages)}")
        print(f"Total jobs: {len(self.jobs)}")
        print(f"{'='*60}\n")

        executor = JobExecutor(workspace)
        stages_with_jobs = self._group_jobs_by_stage()

        # Execute stages in order
        for stage in self.stages:
            stage_jobs = stages_with_jobs.get(stage, [])

            if not stage_jobs:
                continue

            print(f"\n{'─'*60}")
            print(f"Stage: {stage} ({len(stage_jobs)} job(s))")
            print(f"{'─'*60}\n")

            # Execute all jobs in this stage (sequentially for now)
            for job in stage_jobs:
                success = executor.run(job)
                if not success:
                    print(f"\n✗ Pipeline failed at stage '{stage}'")
                    return False

        print(f"\n{'='*60}")
        print("✓ Pipeline completed successfully!")
        print(f"{'='*60}\n")
        return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python runner_v2.py <pipeline.yml>")
        sys.exit(1)

    pipeline = Pipeline(sys.argv[1])
    success = pipeline.run()
    sys.exit(0 if success else 1)
```

#### Testing Version 2

Create a multi-stage pipeline:

```yaml
# pipeline.yml
stages:
  - build
  - test
  - deploy

build-job:
  stage: build
  image: python:3.11
  script:
    - echo "Building application..."
    - mkdir -p dist
    - echo "v1.0.0" > dist/version.txt

test-job:
  stage: test
  image: python:3.11
  script:
    - echo "Running tests..."
    - python -c "print('All tests passed!')"

deploy-job:
  stage: deploy
  image: alpine:latest
  script:
    - echo "Deploying application..."
    - cat dist/version.txt
    - echo "Deployment complete!"
```

Run it:

```bash
python runner_v2.py pipeline.yml
```

Now we have stages! But notice that if you have multiple jobs in the test stage, they still run sequentially. In real CI/CD, jobs in the same stage run in parallel. Let's add that.

### Version 3: Parallel Job Execution

Real pipeline runners execute jobs in the same stage in parallel. Let's implement this using Python's `multiprocessing`:

```python
#!/usr/bin/env python3
"""
Pipeline Runner v3: Parallel execution
Executes jobs within a stage in parallel using multiprocessing
"""

import yaml
import subprocess
import sys
from pathlib import Path
from collections import defaultdict
from multiprocessing import Pool, Manager
from functools import partial


class Job:
    """Represents a single pipeline job."""

    def __init__(self, name, config):
        self.name = name
        self.image = config.get('image', 'python:3.11')
        self.script = config.get('script', [])
        self.stage = config.get('stage', 'test')

    def __repr__(self):
        return f"Job({self.name}, stage={self.stage})"


class JobExecutor:
    """Executes a job in a Docker container."""

    def __init__(self, workspace):
        self.workspace = Path(workspace).resolve()

    def run(self, job, output_queue=None):
        """Execute a job and stream output."""

        def log(msg):
            """Log a message (to queue if available, else stdout)."""
            if output_queue:
                output_queue.put(msg)
            else:
                print(msg)

        log(f"[{job.name}] Starting job...")

        script = ' && '.join(job.script)

        cmd = [
            'docker', 'run', '--rm',
            '-v', f'{self.workspace}:/workspace',
            '-w', '/workspace',
            job.image,
            'sh', '-c', script
        ]

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )

            for line in process.stdout:
                log(f"[{job.name}] {line.rstrip()}")

            process.wait()

            if process.returncode == 0:
                log(f"[{job.name}] ✓ Job completed successfully")
                return (job.name, True, None)
            else:
                error_msg = f"Exit code {process.returncode}"
                log(f"[{job.name}] ✗ Job failed: {error_msg}")
                return (job.name, False, error_msg)

        except Exception as e:
            error_msg = str(e)
            log(f"[{job.name}] ✗ Error: {error_msg}")
            return (job.name, False, error_msg)


def run_job_parallel(job, workspace, output_queue):
    """Helper function for parallel execution."""
    executor = JobExecutor(workspace)
    return executor.run(job, output_queue)


class Pipeline:
    """Represents a pipeline with stages and parallel job execution."""

    def __init__(self, config_file):
        self.config_file = Path(config_file)
        self.config = self._load_config()
        self.stages = self.config.get('stages', ['test'])
        self.jobs = self._parse_jobs()

    def _load_config(self):
        """Load and parse YAML configuration."""
        with open(self.config_file) as f:
            return yaml.safe_load(f)

    def _parse_jobs(self):
        """Parse jobs from configuration."""
        jobs = []
        for job_name, job_config in self.config.items():
            if job_name != 'stages' and isinstance(job_config, dict):
                jobs.append(Job(job_name, job_config))
        return jobs

    def _group_jobs_by_stage(self):
        """Group jobs by their stage."""
        stages = defaultdict(list)
        for job in self.jobs:
            stages[job.stage].append(job)
        return stages

    def run(self, workspace='.'):
        """Execute pipeline with parallel job execution per stage."""
        print(f"\n{'='*60}")
        print(f"Starting pipeline: {self.config_file.name}")
        print(f"Stages: {' → '.join(self.stages)}")
        print(f"Total jobs: {len(self.jobs)}")
        print(f"{'='*60}\n")

        workspace = Path(workspace).resolve()
        stages_with_jobs = self._group_jobs_by_stage()

        # Execute stages in order
        for stage in self.stages:
            stage_jobs = stages_with_jobs.get(stage, [])

            if not stage_jobs:
                continue

            print(f"\n{'─'*60}")
            print(f"Stage: {stage} ({len(stage_jobs)} job(s))")
            print(f"{'─'*60}\n")

            if len(stage_jobs) == 1:
                # Single job - run directly
                executor = JobExecutor(workspace)
                job_name, success, error = executor.run(stage_jobs[0])
                if not success:
                    print(f"\n✗ Pipeline failed at stage '{stage}'")
                    return False
            else:
                # Multiple jobs - run in parallel
                manager = Manager()
                output_queue = manager.Queue()

                # Create a partial function with workspace and queue
                run_func = partial(run_job_parallel, workspace=workspace, output_queue=output_queue)

                # Execute jobs in parallel
                with Pool(processes=len(stage_jobs)) as pool:
                    # Start async execution
                    results = pool.map_async(run_func, stage_jobs)

                    # Print output as it arrives
                    while True:
                        if results.ready() and output_queue.empty():
                            break

                        if not output_queue.empty():
                            print(output_queue.get())

                    # Get results
                    job_results = results.get()

                    # Check if all jobs succeeded
                    if not all(success for _, success, _ in job_results):
                        failed_jobs = [name for name, success, _ in job_results if not success]
                        print(f"\n✗ Pipeline failed at stage '{stage}'")
                        print(f"  Failed jobs: {', '.join(failed_jobs)}")
                        return False

        print(f"\n{'='*60}")
        print("✓ Pipeline completed successfully!")
        print(f"{'='*60}\n")
        return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python runner_v3.py <pipeline.yml>")
        sys.exit(1)

    pipeline = Pipeline(sys.argv[1])
    success = pipeline.run()
    sys.exit(0 if success else 1)
```

#### Testing Version 3

Create a pipeline with parallel jobs:

```yaml
# pipeline.yml
stages:
  - build
  - test

build-job:
  stage: build
  image: python:3.11
  script:
    - echo "Building..."
    - sleep 2

unit-tests:
  stage: test
  image: python:3.11
  script:
    - echo "Running unit tests..."
    - sleep 3
    - echo "Unit tests passed!"

integration-tests:
  stage: test
  image: python:3.11
  script:
    - echo "Running integration tests..."
    - sleep 3
    - echo "Integration tests passed!"
```

Run it and notice that `unit-tests` and `integration-tests` run simultaneously!

Now we have parallel execution, but there's a problem: what if `test` jobs need artifacts from the `build` job? We need dependency management and artifact passing.

### Version 4: Dependencies and Artifacts

This is where it gets interesting. We need to:
1. Build a dependency graph (which jobs need which other jobs)
2. Execute jobs in topological order (respecting dependencies)
3. Pass artifacts between jobs

```python
#!/usr/bin/env python3
"""
Pipeline Runner v4: Dependencies and Artifacts
Supports job dependencies, topological sorting, and artifact passing
"""

import yaml
import subprocess
import sys
import shutil
from pathlib import Path
from collections import defaultdict, deque
from multiprocessing import Pool, Manager
from functools import partial


class Job:
    """Represents a single pipeline job."""

    def __init__(self, name, config):
        self.name = name
        self.image = config.get('image', 'python:3.11')
        self.script = config.get('script', [])
        self.stage = config.get('stage', 'test')
        self.artifacts = config.get('artifacts', {}).get('paths', [])
        self.needs = config.get('needs', [])  # Job dependencies

    def __repr__(self):
        return f"Job({self.name}, stage={self.stage})"


class ArtifactManager:
    """Manages artifact storage and retrieval."""

    def __init__(self, workspace):
        self.workspace = Path(workspace).resolve()
        self.artifact_dir = self.workspace / '.pipeline_artifacts'
        self.artifact_dir.mkdir(exist_ok=True)

    def save_artifacts(self, job_name, artifact_paths):
        """Save artifacts from a job."""
        if not artifact_paths:
            return

        job_artifact_dir = self.artifact_dir / job_name
        job_artifact_dir.mkdir(exist_ok=True)

        for artifact_path in artifact_paths:
            src = self.workspace / artifact_path
            if src.exists():
                dst = job_artifact_dir / artifact_path
                dst.parent.mkdir(parents=True, exist_ok=True)

                if src.is_dir():
                    shutil.copytree(src, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, dst)

                print(f"  Saved artifact: {artifact_path}")

    def load_artifacts(self, job_names):
        """Load artifacts from dependent jobs."""
        for job_name in job_names:
            job_artifact_dir = self.artifact_dir / job_name
            if not job_artifact_dir.exists():
                continue

            # Copy artifacts to workspace
            for item in job_artifact_dir.rglob('*'):
                if item.is_file():
                    rel_path = item.relative_to(job_artifact_dir)
                    dst = self.workspace / rel_path
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(item, dst)

    def cleanup(self):
        """Remove all artifacts."""
        if self.artifact_dir.exists():
            shutil.rmtree(self.artifact_dir)


class JobExecutor:
    """Executes a job in a Docker container."""

    def __init__(self, workspace, artifact_manager):
        self.workspace = Path(workspace).resolve()
        self.artifact_manager = artifact_manager

    def run(self, job, output_queue=None):
        """Execute a job and stream output."""

        def log(msg):
            if output_queue:
                output_queue.put(msg)
            else:
                print(msg)

        log(f"[{job.name}] Starting job...")

        # Load artifacts from dependencies
        if job.needs:
            log(f"[{job.name}] Loading artifacts from: {', '.join(job.needs)}")
            self.artifact_manager.load_artifacts(job.needs)

        script = ' && '.join(job.script)

        cmd = [
            'docker', 'run', '--rm',
            '-v', f'{self.workspace}:/workspace',
            '-w', '/workspace',
            job.image,
            'sh', '-c', script
        ]

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )

            for line in process.stdout:
                log(f"[{job.name}] {line.rstrip()}")

            process.wait()

            if process.returncode == 0:
                # Save artifacts
                if job.artifacts:
                    log(f"[{job.name}] Saving artifacts...")
                    self.artifact_manager.save_artifacts(job.name, job.artifacts)

                log(f"[{job.name}] ✓ Job completed successfully")
                return (job.name, True, None)
            else:
                error_msg = f"Exit code {process.returncode}"
                log(f"[{job.name}] ✗ Job failed: {error_msg}")
                return (job.name, False, error_msg)

        except Exception as e:
            error_msg = str(e)
            log(f"[{job.name}] ✗ Error: {error_msg}")
            return (job.name, False, error_msg)


def run_job_parallel(job, workspace, artifact_manager, output_queue):
    """Helper function for parallel execution."""
    executor = JobExecutor(workspace, artifact_manager)
    return executor.run(job, output_queue)


class Pipeline:
    """Represents a pipeline with dependency-aware execution."""

    def __init__(self, config_file):
        self.config_file = Path(config_file)
        self.config = self._load_config()
        self.stages = self.config.get('stages', ['test'])
        self.jobs = self._parse_jobs()

    def _load_config(self):
        """Load and parse YAML configuration."""
        with open(self.config_file) as f:
            return yaml.safe_load(f)

    def _parse_jobs(self):
        """Parse jobs from configuration."""
        jobs = []
        for job_name, job_config in self.config.items():
            if job_name != 'stages' and isinstance(job_config, dict):
                jobs.append(Job(job_name, job_config))
        return jobs

    def _topological_sort(self, jobs):
        """
        Sort jobs in topological order based on dependencies.
        Returns list of job groups where each group can run in parallel.
        """
        # Build adjacency list and in-degree count
        job_map = {job.name: job for job in jobs}
        in_degree = {job.name: 0 for job in jobs}
        adjacency = defaultdict(list)

        for job in jobs:
            for dep in job.needs:
                if dep in job_map:
                    adjacency[dep].append(job.name)
                    in_degree[job.name] += 1

        # Find jobs with no dependencies
        queue = deque([name for name, degree in in_degree.items() if degree == 0])
        execution_order = []

        while queue:
            # All jobs in current queue can run in parallel
            current_batch = list(queue)
            execution_order.append([job_map[name] for name in current_batch])

            queue.clear()

            # Process current batch
            for job_name in current_batch:
                for dependent in adjacency[job_name]:
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        queue.append(dependent)

        # Check for cycles
        if sum(len(batch) for batch in execution_order) != len(jobs):
            raise ValueError("Circular dependency detected in job dependencies")

        return execution_order

    def _group_jobs_by_stage(self):
        """Group jobs by their stage."""
        stages = defaultdict(list)
        for job in self.jobs:
            stages[job.stage].append(job)
        return stages

    def _execute_job_batch(self, jobs, workspace, artifact_manager):
        """Execute a batch of jobs in parallel."""
        if len(jobs) == 1:
            # Single job - run directly
            executor = JobExecutor(workspace, artifact_manager)
            job_name, success, error = executor.run(jobs[0])
            return [(job_name, success, error)]
        else:
            # Multiple jobs - run in parallel
            manager = Manager()
            output_queue = manager.Queue()

            # Create a partial function
            run_func = partial(
                run_job_parallel,
                workspace=workspace,
                artifact_manager=artifact_manager,
                output_queue=output_queue
            )

            # Execute jobs in parallel
            with Pool(processes=len(jobs)) as pool:
                results = pool.map_async(run_func, jobs)

                # Print output as it arrives
                while True:
                    if results.ready() and output_queue.empty():
                        break

                    if not output_queue.empty():
                        print(output_queue.get())

                return results.get()

    def run(self, workspace='.'):
        """Execute pipeline with dependency resolution."""
        print(f"\n{'='*60}")
        print(f"Starting pipeline: {self.config_file.name}")
        print(f"Stages: {' → '.join(self.stages)}")
        print(f"Total jobs: {len(self.jobs)}")
        print(f"{'='*60}\n")

        workspace = Path(workspace).resolve()
        artifact_manager = ArtifactManager(workspace)
        stages_with_jobs = self._group_jobs_by_stage()

        try:
            # Execute stages in order
            for stage in self.stages:
                stage_jobs = stages_with_jobs.get(stage, [])

                if not stage_jobs:
                    continue

                print(f"\n{'─'*60}")
                print(f"Stage: {stage} ({len(stage_jobs)} job(s))")
                print(f"{'─'*60}\n")

                # Sort jobs by dependencies
                try:
                    execution_batches = self._topological_sort(stage_jobs)
                except ValueError as e:
                    print(f"✗ Error: {e}")
                    return False

                # Execute batches in order
                for batch in execution_batches:
                    job_results = self._execute_job_batch(batch, workspace, artifact_manager)

                    # Check if all jobs succeeded
                    if not all(success for _, success, _ in job_results):
                        failed_jobs = [name for name, success, _ in job_results if not success]
                        print(f"\n✗ Pipeline failed at stage '{stage}'")
                        print(f"  Failed jobs: {', '.join(failed_jobs)}")
                        return False

            print(f"\n{'='*60}")
            print("✓ Pipeline completed successfully!")
            print(f"{'='*60}\n")
            return True

        finally:
            # Cleanup artifacts
            artifact_manager.cleanup()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python runner_v4.py <pipeline.yml>")
        sys.exit(1)

    pipeline = Pipeline(sys.argv[1])
    success = pipeline.run()
    sys.exit(0 if success else 1)
```

#### Testing Version 4

Create a pipeline with dependencies and artifacts:

```yaml
# pipeline.yml
stages:
  - build
  - test
  - deploy

build-app:
  stage: build
  image: python:3.11
  script:
    - echo "Building application..."
    - mkdir -p dist
    - echo "app-v1.0.0" > dist/app.txt
    - echo "Build complete!"
  artifacts:
    paths:
      - dist/

unit-tests:
  stage: test
  image: python:3.11
  needs:
    - build-app
  script:
    - echo "Running unit tests..."
    - ls -la dist/
    - cat dist/app.txt
    - echo "Tests passed!"

integration-tests:
  stage: test
  image: python:3.11
  needs:
    - build-app
  script:
    - echo "Running integration tests..."
    - cat dist/app.txt
    - echo "Integration tests passed!"

deploy-prod:
  stage: deploy
  image: alpine:latest
  needs:
    - unit-tests
    - integration-tests
  script:
    - echo "Deploying to production..."
    - cat dist/app.txt
    - echo "Deployed!"
```

Run it:

```bash
python runner_v4.py pipeline.yml
```

Notice how:
- `build-app` runs first
- `unit-tests` and `integration-tests` run in parallel (both depend on `build-app`)
- `deploy-prod` runs only after both test jobs complete
- Artifacts (the `dist/` folder) are passed between jobs!

This is getting close to a real CI/CD runner. Let's add one more version with production-ready features.

### Version 5: Production-Ready Features

Let's add the final touches: environment variables, branch filtering, timeouts, and better error handling:

{% raw %}
```python
#!/usr/bin/env python3
"""
Pipeline Runner v5: Production-ready
Complete CI/CD runner with all features
"""

import yaml
import subprocess
import sys
import shutil
import os
import re
from pathlib import Path
from collections import defaultdict, deque
from multiprocessing import Pool, Manager
from functools import partial
import time


def get_current_branch():
    """Get the current git branch."""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.stdout.strip() if result.returncode == 0 else 'main'
    except:
        return 'main'


def substitute_variables(text, variables):
    """Substitute ${VAR} style variables in text."""
    if not isinstance(text, str):
        return text

    for key, value in variables.items():
        text = text.replace(f'${{{key}}}', str(value))
        text = text.replace(f'${key}', str(value))

    return text


class Job:
    """Represents a single pipeline job."""

    def __init__(self, name, config, global_variables=None):
        self.name = name
        self.image = config.get('image', 'python:3.11')
        self.script = config.get('script', [])
        self.stage = config.get('stage', 'test')
        self.artifacts = config.get('artifacts', {}).get('paths', [])
        self.needs = config.get('needs', [])
        self.only = config.get('only', [])  # Branch filter
        self.timeout = config.get('timeout', 3600)  # Default 1 hour

        # Substitute variables in image and script
        variables = global_variables or {}
        self.image = substitute_variables(self.image, variables)
        self.script = [substitute_variables(cmd, variables) for cmd in self.script]

    def should_run(self, branch):
        """Check if job should run on current branch."""
        if not self.only:
            return True
        return branch in self.only

    def __repr__(self):
        return f"Job({self.name}, stage={self.stage})"


class ArtifactManager:
    """Manages artifact storage and retrieval."""

    def __init__(self, workspace):
        self.workspace = Path(workspace).resolve()
        self.artifact_dir = self.workspace / '.pipeline_artifacts'
        self.artifact_dir.mkdir(exist_ok=True)

    def save_artifacts(self, job_name, artifact_paths):
        """Save artifacts from a job."""
        if not artifact_paths:
            return

        job_artifact_dir = self.artifact_dir / job_name
        job_artifact_dir.mkdir(exist_ok=True)

        saved_count = 0
        for artifact_path in artifact_paths:
            src = self.workspace / artifact_path
            if src.exists():
                dst = job_artifact_dir / artifact_path
                dst.parent.mkdir(parents=True, exist_ok=True)

                if src.is_dir():
                    shutil.copytree(src, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(src, dst)

                saved_count += 1

        return saved_count

    def load_artifacts(self, job_names):
        """Load artifacts from dependent jobs."""
        loaded_count = 0
        for job_name in job_names:
            job_artifact_dir = self.artifact_dir / job_name
            if not job_artifact_dir.exists():
                continue

            for item in job_artifact_dir.rglob('*'):
                if item.is_file():
                    rel_path = item.relative_to(job_artifact_dir)
                    dst = self.workspace / rel_path
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(item, dst)
                    loaded_count += 1

        return loaded_count

    def cleanup(self):
        """Remove all artifacts."""
        if self.artifact_dir.exists():
            shutil.rmtree(self.artifact_dir)


class JobExecutor:
    """Executes a job in a Docker container."""

    def __init__(self, workspace, artifact_manager):
        self.workspace = Path(workspace).resolve()
        self.artifact_manager = artifact_manager

    def run(self, job, output_queue=None):
        """Execute a job with timeout and proper error handling."""

        def log(msg):
            if output_queue:
                output_queue.put(msg)
            else:
                print(msg)

        start_time = time.time()
        log(f"[{job.name}] Starting job...")
        log(f"[{job.name}] Image: {job.image}")

        # Load artifacts from dependencies
        if job.needs:
            log(f"[{job.name}] Loading artifacts from dependencies...")
            count = self.artifact_manager.load_artifacts(job.needs)
            if count > 0:
                log(f"[{job.name}] Loaded {count} artifact file(s)")

        script = ' && '.join(job.script)

        cmd = [
            'docker', 'run', '--rm',
            '-v', f'{self.workspace}:/workspace',
            '-w', '/workspace',
            job.image,
            'sh', '-c', script
        ]

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )

            # Read output with timeout
            start = time.time()
            for line in process.stdout:
                if time.time() - start > job.timeout:
                    process.kill()
                    log(f"[{job.name}] ✗ Job timed out after {job.timeout}s")
                    return (job.name, False, "Timeout")

                log(f"[{job.name}] {line.rstrip()}")

            process.wait()

            if process.returncode == 0:
                # Save artifacts
                if job.artifacts:
                    log(f"[{job.name}] Saving artifacts...")
                    count = self.artifact_manager.save_artifacts(job.name, job.artifacts)
                    if count > 0:
                        log(f"[{job.name}] Saved {count} artifact(s)")

                duration = time.time() - start_time
                log(f"[{job.name}] ✓ Job completed successfully ({duration:.1f}s)")
                return (job.name, True, None)
            else:
                error_msg = f"Exit code {process.returncode}"
                log(f"[{job.name}] ✗ Job failed: {error_msg}")
                return (job.name, False, error_msg)

        except Exception as e:
            error_msg = str(e)
            log(f"[{job.name}] ✗ Error: {error_msg}")
            return (job.name, False, error_msg)


def run_job_parallel(job, workspace, artifact_manager, output_queue):
    """Helper function for parallel execution."""
    executor = JobExecutor(workspace, artifact_manager)
    return executor.run(job, output_queue)


class Pipeline:
    """Complete pipeline runner with all features."""

    def __init__(self, config_file):
        self.config_file = Path(config_file)
        self.config = self._load_config()
        self.stages = self.config.get('stages', ['test'])
        self.variables = self.config.get('variables', {})
        self.jobs = self._parse_jobs()
        self.current_branch = get_current_branch()

    def _load_config(self):
        """Load and parse YAML configuration."""
        with open(self.config_file) as f:
            return yaml.safe_load(f)

    def _parse_jobs(self):
        """Parse jobs from configuration."""
        jobs = []
        for job_name, job_config in self.config.items():
            if job_name not in ['stages', 'variables'] and isinstance(job_config, dict):
                jobs.append(Job(job_name, job_config, self.variables))
        return jobs

    def _topological_sort(self, jobs):
        """Sort jobs in topological order based on dependencies."""
        job_map = {job.name: job for job in jobs}
        in_degree = {job.name: 0 for job in jobs}
        adjacency = defaultdict(list)

        for job in jobs:
            for dep in job.needs:
                if dep in job_map:
                    adjacency[dep].append(job.name)
                    in_degree[job.name] += 1

        queue = deque([name for name, degree in in_degree.items() if degree == 0])
        execution_order = []

        while queue:
            current_batch = list(queue)
            execution_order.append([job_map[name] for name in current_batch])
            queue.clear()

            for job_name in current_batch:
                for dependent in adjacency[job_name]:
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        queue.append(dependent)

        if sum(len(batch) for batch in execution_order) != len(jobs):
            raise ValueError("Circular dependency detected in job dependencies")

        return execution_order

    def _group_jobs_by_stage(self):
        """Group jobs by their stage."""
        stages = defaultdict(list)
        for job in self.jobs:
            if job.should_run(self.current_branch):
                stages[job.stage].append(job)
        return stages

    def _execute_job_batch(self, jobs, workspace, artifact_manager):
        """Execute a batch of jobs in parallel."""
        if len(jobs) == 1:
            executor = JobExecutor(workspace, artifact_manager)
            job_name, success, error = executor.run(jobs[0])
            return [(job_name, success, error)]
        else:
            manager = Manager()
            output_queue = manager.Queue()

            run_func = partial(
                run_job_parallel,
                workspace=workspace,
                artifact_manager=artifact_manager,
                output_queue=output_queue
            )

            with Pool(processes=len(jobs)) as pool:
                results = pool.map_async(run_func, jobs)

                while True:
                    if results.ready() and output_queue.empty():
                        break

                    if not output_queue.empty():
                        print(output_queue.get())

                return results.get()

    def run(self, workspace='.'):
        """Execute complete pipeline."""
        print(f"\n{'='*60}")
        print(f"Pipeline Runner v5")
        print(f"{'='*60}")
        print(f"Config: {self.config_file.name}")
        print(f"Branch: {self.current_branch}")
        print(f"Stages: {' → '.join(self.stages)}")
        print(f"Total jobs: {len(self.jobs)}")
        if self.variables:
            print(f"Variables: {', '.join(f'{k}={v}' for k, v in self.variables.items())}")
        print(f"{'='*60}\n")

        workspace = Path(workspace).resolve()
        artifact_manager = ArtifactManager(workspace)
        stages_with_jobs = self._group_jobs_by_stage()

        # Count jobs that will run
        total_jobs = sum(len(jobs) for jobs in stages_with_jobs.values())
        if total_jobs == 0:
            print("No jobs to run on this branch.")
            return True

        pipeline_start = time.time()

        try:
            for stage in self.stages:
                stage_jobs = stages_with_jobs.get(stage, [])

                if not stage_jobs:
                    continue

                print(f"\n{'─'*60}")
                print(f"Stage: {stage} ({len(stage_jobs)} job(s))")
                print(f"{'─'*60}\n")

                try:
                    execution_batches = self._topological_sort(stage_jobs)
                except ValueError as e:
                    print(f"✗ Error: {e}")
                    return False

                for batch in execution_batches:
                    job_results = self._execute_job_batch(batch, workspace, artifact_manager)

                    if not all(success for _, success, _ in job_results):
                        failed_jobs = [name for name, success, _ in job_results if not success]
                        print(f"\n{'='*60}")
                        print(f"✗ Pipeline failed at stage '{stage}'")
                        print(f"  Failed jobs: {', '.join(failed_jobs)}")
                        print(f"{'='*60}\n")
                        return False

            duration = time.time() - pipeline_start
            print(f"\n{'='*60}")
            print(f"✓ Pipeline completed successfully!")
            print(f"  Duration: {duration:.1f}s")
            print(f"  Jobs executed: {total_jobs}")
            print(f"{'='*60}\n")
            return True

        finally:
            artifact_manager.cleanup()


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Pipeline Runner v5 - A minimal CI/CD pipeline runner")
        print("\nUsage:")
        print("  python runner.py <pipeline.yml> [workspace]")
        print("\nExample:")
        print("  python runner.py .gitlab-ci.yml")
        print("  python runner.py pipeline.yml /path/to/workspace")
        sys.exit(1)

    config_file = sys.argv[1]
    workspace = sys.argv[2] if len(sys.argv) > 2 else '.'

    if not Path(config_file).exists():
        print(f"Error: Config file '{config_file}' not found")
        sys.exit(1)

    try:
        pipeline = Pipeline(config_file)
        success = pipeline.run(workspace)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
```
{% endraw %}

#### Testing Version 5

Create a complete pipeline with all features:

```yaml
# pipeline.yml
stages:
  - build
  - test
  - deploy

variables:
  APP_VERSION: "1.0.0"
  PYTHON_IMAGE: "python:3.11"

build-app:
  stage: build
  image: ${PYTHON_IMAGE}
  script:
    - echo "Building version ${APP_VERSION}..."
    - mkdir -p dist
    - echo "app-${APP_VERSION}" > dist/app.txt
    - echo "Build complete!"
  artifacts:
    paths:
      - dist/

unit-tests:
  stage: test
  image: ${PYTHON_IMAGE}
  needs:
    - build-app
  script:
    - echo "Running unit tests..."
    - cat dist/app.txt
    - sleep 2
    - echo "Unit tests passed!"

integration-tests:
  stage: test
  image: ${PYTHON_IMAGE}
  needs:
    - build-app
  script:
    - echo "Running integration tests..."
    - cat dist/app.txt
    - sleep 2
    - echo "Integration tests passed!"

deploy-staging:
  stage: deploy
  image: alpine:latest
  needs:
    - unit-tests
    - integration-tests
  script:
    - echo "Deploying to staging..."
    - cat dist/app.txt
    - echo "Deployed to staging!"

deploy-production:
  stage: deploy
  image: alpine:latest
  needs:
    - unit-tests
    - integration-tests
  only:
    - main
  script:
    - echo "Deploying to production..."
    - cat dist/app.txt
    - echo "Deployed to production!"
```

Run it:

```bash
python runner.py pipeline.yml
```

You'll see:
- Variable substitution (`${APP_VERSION}`, `${PYTHON_IMAGE}`)
- Dependency-based execution order
- Parallel test execution
- Branch filtering (deploy-production only on main)
- Execution time tracking
- Proper artifact passing

**We now have a fully functional CI/CD pipeline runner!**

## Testing Your Pipeline Runner

Let's test it with a real Python project. Create this structure:

```
my-project/
├── pipeline.yml
├── src/
│   └── calculator.py
└── tests/
    └── test_calculator.py
```

**src/calculator.py:**
```python
def add(a, b):
    return a + b

def multiply(a, b):
    return a * b
```

**tests/test_calculator.py:**
```python
import sys
sys.path.insert(0, 'src')

from calculator import add, multiply

def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0

def test_multiply():
    assert multiply(3, 4) == 12
    assert multiply(0, 5) == 0

if __name__ == "__main__":
    test_add()
    test_multiply()
    print("All tests passed!")
```

**pipeline.yml:**
```yaml
stages:
  - test
  - build
  - deploy

variables:
  PYTHON_VERSION: "3.11"

lint-code:
  stage: test
  image: python:${PYTHON_VERSION}
  script:
    - echo "Linting code..."
    - python -m py_compile src/*.py
    - echo "Lint passed!"

unit-tests:
  stage: test
  image: python:${PYTHON_VERSION}
  script:
    - echo "Running unit tests..."
    - python tests/test_calculator.py
    - echo "Tests passed!"

build-package:
  stage: build
  image: python:${PYTHON_VERSION}
  needs:
    - lint-code
    - unit-tests
  script:
    - echo "Building package..."
    - mkdir -p dist
    - cp -r src dist/
    - echo "v1.0.0" > dist/VERSION
  artifacts:
    paths:
      - dist/

deploy-app:
  stage: deploy
  image: alpine:latest
  needs:
    - build-package
  script:
    - echo "Deploying application..."
    - ls -la dist/
    - cat dist/VERSION
    - echo "Deployment complete!"
```

Run your pipeline:

```bash
python runner.py pipeline.yml
```

You'll see:
1. `lint-code` and `unit-tests` run in parallel
2. `build-package` waits for both to complete
3. Artifacts (dist/) are passed to `deploy-app`
4. Total execution time is optimized through parallelization

## What We Built vs. What Production Runners Do

Our pipeline runner demonstrates the core concepts, but production tools like GitLab Runner and GitHub Actions have many more features:

**What we built:**
- ✅ Multi-stage pipelines
- ✅ Parallel job execution within stages
- ✅ Job dependencies (needs/dependencies)
- ✅ Artifact passing between jobs
- ✅ Variable substitution
- ✅ Branch filtering (only: branches)
- ✅ Job timeouts
- ✅ Real-time log streaming
- ✅ Topological sorting for dependencies
- ✅ Docker container isolation

**What production runners add:**
- **Distributed execution**: Run jobs across multiple machines
- **Caching**: Cache dependencies (node_modules, pip packages) between runs
- **Matrix builds**: Run same job with different parameters (Python 3.9, 3.10, 3.11)
- **Webhooks**: Trigger on git push, PR, tag events
- **Secrets management**: Secure credential storage and injection
- **Web UI**: Visual pipeline visualization and logs
- **Docker-in-Docker**: Build Docker images within jobs
- **Service containers**: Database/Redis for integration tests
- **Retry mechanisms**: Automatic retry on transient failures
- **Manual triggers**: Approval gates for deployments
- **Resource management**: CPU/memory limits per job
- **Security features**: Isolation, sandboxing, permission control

## Understanding the Architecture

Our runner has four main components:

### 1. Configuration Parser
Reads YAML and builds job objects with all metadata (stage, dependencies, artifacts, etc.)

### 2. Dependency Resolver
Uses topological sorting to determine execution order. This ensures jobs run only after their dependencies complete.

### 3. Job Scheduler
Groups jobs into batches that can run in parallel. Uses Python's multiprocessing for parallel execution.

### 4. Job Executor
Spawns Docker containers, mounts workspace, executes scripts, streams logs, and manages artifacts.

The flow:
```
YAML Config → Parse Jobs → Build Dependency Graph →
Topological Sort → Execute Batches → Save Artifacts → Report Results
```

## Real-World Use Cases

You could actually use this runner for:

1. **Local CI/CD testing**: Test your pipeline config before pushing
2. **Air-gapped environments**: No external CI/CD access
3. **Custom workflows**: Company-specific requirements
4. **Learning tool**: Understand how CI/CD works internally
5. **Embedded systems**: Limited connectivity to cloud runners
6. **On-premise deployments**: Full control over execution environment

## Performance Considerations

Our runner is reasonably efficient, but here's what impacts performance:

**What makes it fast:**
- Parallel execution within stages
- Dependency-aware scheduling (no unnecessary waiting)
- Docker container reuse
- Minimal artifact copying

**What could slow it down:**
- Docker image pulls (first time)
- Large artifacts being copied
- Many jobs in sequence (long critical path)
- Heavy multiprocessing overhead for tiny jobs

**Optimizations you could add:**
- Cache Docker images
- Compress artifacts
- Parallel artifact downloads
- Job scheduling across machines

## Extending the Runner

Here are features you could add:

### 1. Caching
```yaml
build:
  cache:
    key: ${CI_COMMIT_REF}
    paths:
      - node_modules/
```

### 2. Matrix Builds
```yaml
test:
  image: python:${VERSION}
  matrix:
    VERSION: ["3.9", "3.10", "3.11"]
```

### 3. Service Containers
```yaml
integration-test:
  services:
    - postgres:13
    - redis:6
```

### 4. Manual Triggers
```yaml
deploy:
  when: manual  # Require manual approval
```

### 5. Retry Logic
```yaml
flaky-test:
  retry: 2  # Retry up to 2 times
```

## Conclusion

By building this CI/CD pipeline runner, we've demystified how GitLab Runner and GitHub Actions work internally. The core concepts aren't that complicated:

- **Parse configuration** into job objects
- **Build a dependency graph** to understand execution order
- **Use topological sorting** to schedule jobs correctly
- **Execute jobs in containers** for isolation
- **Pass artifacts** between dependent jobs
- **Stream logs** for visibility

GitLab's innovation wasn't inventing these concepts - it was packaging them into a developer-friendly tool with great UX, distributed execution, and enterprise features.

Understanding these fundamentals makes you a better DevOps engineer. When pipelines are slow, you'll know why. When jobs fail mysteriously, you'll know where to look. When you need custom CI/CD, you'll know how to build it.

## Further Learning

If you want to dive deeper:

- **GitLab Runner source code**: Written in Go, shows production implementation
- **GitHub Actions runner**: Open source, similar concepts
- **Tekton**: Kubernetes-native pipelines
- **Drone CI**: Simple, container-focused CI/CD
- **Argo Workflows**: DAG-based workflow engine for Kubernetes

I also recommend reading about:
- **Directed Acyclic Graphs (DAGs)**: Foundation of job dependencies
- **Topological sorting**: Algorithm for dependency resolution
- **Container orchestration**: Kubernetes, Docker Swarm
- **Workflow engines**: Apache Airflow, Prefect

## Next Steps

Want to take this further? Here are some ideas:

1. **Add a web UI**: Use Flask + WebSockets for real-time pipeline visualization
2. **Implement caching**: Cache pip/npm packages between runs
3. **Add distributed execution**: Run jobs across multiple machines
4. **Build a webhook server**: Trigger on git push events
5. **Create a VS Code extension**: Visualize pipelines in your editor

Let me know in the comments what you'd like to see next!

---

#### Announcements

- If you're interested in more systems programming and DevOps content, follow me on [Twitter/X](https://twitter.com/muhammad_o7) where I share what I'm learning.
- I'm available for Python and DevOps consulting - if you need help with CI/CD, automation, or infrastructure, reach out via [email](mailto:muhammadraza0047@gmail.com).

<br>
_If you found this helpful, share it on X and tag me [@muhammad_o7](https://twitter.com/muhammad_o7) - I'd love to hear your thoughts! You can also connect with me on [LinkedIn](https://www.linkedin.com/in/muhammad-raza-07/)._

**Want to be notified about posts like this? Subscribe to my RSS feed or leave your email [here](https://forms.gle/M1EK61LLCxJ3iTiD7)**
