---
layout: post
title: "Understanding Docker Internals: Building a Container Runtime in Python"
description: "Demystify container technology by building a simple container runtime from scratch using Python and Linux primitives like namespaces and cgroups"
keywords: "python docker containers linux namespaces cgroups devops systems-programming"
tags: [python, linux]
comments: true
---

I've been working with containers professionally for several years now, using Docker and Kubernetes daily in production environments. Like many developers, I initially treated containers as "magic boxes" - I knew how to use them, but didn't really understand what was happening under the hood. It wasn't until I needed to debug a particularly nasty container networking issue at work that I realized I needed to understand the underlying technology better.

In this post, I'll take you on a journey to demystify container technology by building a simple container runtime in Python. We'll explore the Linux primitives that make containers possible and implement them step by step. By the end, you'll understand that containers aren't magic - they're just clever uses of existing Linux features.

## What Actually IS a Container?

Before we start building, let's clear up a common misconception: **containers are NOT lightweight virtual machines**. This comparison, while convenient for explaining containers to newcomers, is technically misleading.

A virtual machine includes an entire operating system with its own kernel. Containers, on the other hand, share the host's kernel and use Linux features to create isolated environments. Specifically, containers are built on three main Linux primitives:

1. **Namespaces** - Provide isolation (process, network, filesystem, etc.)
2. **Control Groups (cgroups)** - Limit and monitor resource usage (CPU, memory, I/O)
3. **Filesystem Isolation** - Use chroot/pivot_root to change the root filesystem

When you run `docker run ubuntu bash`, Docker is essentially:
- Creating namespaces to isolate the process
- Setting up cgroups to limit resources
- Using an overlay filesystem to provide the Ubuntu root filesystem
- Executing `/bin/bash` in this isolated environment

Let's build this ourselves to see exactly how it works.

## Understanding Linux Namespaces

Namespaces are a Linux kernel feature that partitions kernel resources. Different processes can have different views of the system. Linux provides several types of namespaces:

- **PID Namespace** - Process isolation. Processes in a namespace only see processes within that namespace.
- **Network Namespace** - Network isolation. Each namespace has its own network devices, IP addresses, routing tables.
- **Mount Namespace** - Filesystem isolation. Each namespace can have its own mount points.
- **UTS Namespace** - Hostname isolation. Each namespace can have its own hostname.
- **IPC Namespace** - Inter-process communication isolation.
- **User Namespace** - User and group ID isolation.

Let's start by implementing the simplest form of isolation: PID namespaces.

## Building Our Container Runtime

### Step 1: Basic Process Isolation with PID Namespaces

Let's create our first container that isolates processes:

```python
#!/usr/bin/env python3
import os
import sys
import subprocess

def run_in_container(command):
    """
    Run a command in an isolated PID namespace.
    This creates a new process namespace where the command
    will be PID 1 and won't see host processes.
    """
    print(f"Starting container with command: {command}")
    print(f"Parent process PID: {os.getpid()}")

    # Create a child process
    pid = os.fork()

    if pid == 0:
        # Child process
        try:
            # Create a new PID namespace
            # CLONE_NEWPID creates a new process namespace
            os.unshare(os.CLONE_NEWPID)

            # Mount /proc so we can see our isolated process tree
            # Note: This requires root privileges
            subprocess.run(['mount', '-t', 'proc', 'proc', '/proc'])

            print(f"Container process PID: {os.getpid()}")

            # Execute the command
            os.execvp(command[0], command)
        except Exception as e:
            print(f"Error in container: {e}")
            sys.exit(1)
    else:
        # Parent process - wait for child to complete
        os.waitpid(pid, 0)
        print("Container exited")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 simple_container.py <command>")
        sys.exit(1)

    if os.geteuid() != 0:
        print("This script requires root privileges")
        sys.exit(1)

    command = sys.argv[1:]
    run_in_container(command)
```

#### Testing PID Isolation

Save this as `simple_container.py` and run it:

```bash
sudo python3 simple_container.py bash
```

Inside the container, try running:
```bash
ps aux  # You'll only see processes in this namespace!
echo $$  # This will show PID 1
```

This is our first step towards a container - we've isolated the process tree!

### Step 2: Filesystem Isolation with chroot

Now let's add filesystem isolation. We'll create a minimal root filesystem and use `chroot` to change the root directory:

```python
#!/usr/bin/env python3
import os
import sys
import subprocess
import tempfile
import shutil

def setup_rootfs(rootfs_path):
    """
    Create a minimal root filesystem.
    In production, this would be container image layers.
    """
    print(f"Setting up root filesystem at {rootfs_path}")

    # Create basic directory structure
    dirs = ['bin', 'lib', 'lib64', 'usr', 'proc', 'sys', 'dev', 'tmp']
    for d in dirs:
        os.makedirs(os.path.join(rootfs_path, d), exist_ok=True)

    # Copy essential binaries (bash and ls for demo)
    binaries = ['/bin/bash', '/bin/ls', '/bin/ps']
    for binary in binaries:
        if os.path.exists(binary):
            dest = os.path.join(rootfs_path, binary.lstrip('/'))
            shutil.copy2(binary, dest)

            # Copy required shared libraries
            copy_dependencies(binary, rootfs_path)

def copy_dependencies(binary, rootfs_path):
    """
    Copy shared library dependencies for a binary.
    Uses ldd to find dependencies.
    """
    try:
        result = subprocess.run(['ldd', binary],
                              capture_output=True,
                              text=True)

        for line in result.stdout.split('\n'):
            if '=>' in line:
                parts = line.split('=>')
                if len(parts) > 1:
                    lib_path = parts[1].strip().split()[0]
                    if os.path.exists(lib_path):
                        dest = os.path.join(rootfs_path, lib_path.lstrip('/'))
                        os.makedirs(os.path.dirname(dest), exist_ok=True)
                        if not os.path.exists(dest):
                            shutil.copy2(lib_path, dest)
    except Exception as e:
        print(f"Warning: Could not copy dependencies for {binary}: {e}")

def run_container(command, rootfs_path):
    """
    Run a command in an isolated container with its own filesystem.
    """
    print(f"Starting container with command: {command}")

    pid = os.fork()

    if pid == 0:
        # Child process
        try:
            # Create new namespaces
            # CLONE_NEWPID: new process namespace
            # CLONE_NEWNS: new mount namespace
            # CLONE_NEWUTS: new hostname namespace
            os.unshare(os.CLONE_NEWPID | os.CLONE_NEWNS | os.CLONE_NEWUTS)

            # Set hostname for this container
            hostname = "container"
            os.system(f'hostname {hostname}')

            # Change root filesystem
            os.chroot(rootfs_path)
            os.chdir('/')

            # Mount /proc in the container
            os.makedirs('/proc', exist_ok=True)
            subprocess.run(['mount', '-t', 'proc', 'proc', '/proc'],
                         stderr=subprocess.DEVNULL)

            print(f"Container started with hostname: {hostname}")
            print(f"Root filesystem: {rootfs_path}")

            # Execute the command
            os.execvp(command[0], command)

        except Exception as e:
            print(f"Error in container: {e}")
            sys.exit(1)
    else:
        # Parent process
        try:
            os.waitpid(pid, 0)
        except KeyboardInterrupt:
            print("\nContainer interrupted")
        print("Container exited")

if __name__ == "__main__":
    if os.geteuid() != 0:
        print("This script requires root privileges")
        sys.exit(1)

    if len(sys.argv) < 2:
        print("Usage: sudo python3 container_v2.py <command>")
        sys.exit(1)

    # Create temporary root filesystem
    rootfs_path = tempfile.mkdtemp(prefix='container_rootfs_')

    try:
        setup_rootfs(rootfs_path)
        command = sys.argv[1:]
        run_container(command, rootfs_path)
    finally:
        # Cleanup
        print(f"Cleaning up {rootfs_path}")
        shutil.rmtree(rootfs_path, ignore_errors=True)
```

Now when you run this, you'll have a container with:
- Isolated process tree
- Isolated filesystem
- Custom hostname

```bash
sudo python3 container_v2.py bash
```

Try these commands inside:
```bash
hostname  # Should show "container"
ls /      # Should only see our minimal filesystem
ps aux    # Only processes in this namespace
```

### Step 3: Resource Limits with cgroups

Now let's add resource limits using cgroups (control groups). This is what prevents a container from consuming all system resources:

```python
#!/usr/bin/env python3
import os
import sys
import subprocess

class CgroupManager:
    """
    Manages cgroups v2 for resource limiting.
    Modern Linux systems use cgroups v2.
    """

    def __init__(self, container_id):
        self.container_id = container_id
        self.cgroup_path = f"/sys/fs/cgroup/container_{container_id}"

    def create(self, memory_limit_mb=100, cpu_shares=512):
        """
        Create a cgroup with resource limits.

        Args:
            memory_limit_mb: Memory limit in megabytes
            cpu_shares: CPU shares (1024 = 100% of one CPU)
        """
        try:
            # Create cgroup directory
            os.makedirs(self.cgroup_path, exist_ok=True)

            # Set memory limit
            memory_limit_bytes = memory_limit_mb * 1024 * 1024
            with open(f"{self.cgroup_path}/memory.max", 'w') as f:
                f.write(str(memory_limit_bytes))

            # Set CPU limit
            # cpu.max format: $MAX $PERIOD (in microseconds)
            # For example, "50000 100000" means 50% of one CPU
            cpu_quota = int((cpu_shares / 1024) * 100000)
            with open(f"{self.cgroup_path}/cpu.max", 'w') as f:
                f.write(f"{cpu_quota} 100000")

            print(f"Created cgroup with limits:")
            print(f"  Memory: {memory_limit_mb}MB")
            print(f"  CPU: {cpu_shares}/1024 shares")

        except Exception as e:
            print(f"Warning: Could not set cgroup limits: {e}")
            print("Continuing without resource limits...")

    def add_process(self, pid):
        """Add a process to this cgroup."""
        try:
            with open(f"{self.cgroup_path}/cgroup.procs", 'w') as f:
                f.write(str(pid))
        except Exception as e:
            print(f"Warning: Could not add process to cgroup: {e}")

    def cleanup(self):
        """Remove the cgroup."""
        try:
            os.rmdir(self.cgroup_path)
        except Exception as e:
            print(f"Warning: Could not remove cgroup: {e}")

def run_container_with_limits(command, memory_mb=100, cpu_shares=512):
    """
    Run a container with resource limits.
    """
    import time
    import uuid

    container_id = str(uuid.uuid4())[:8]
    cgroup = CgroupManager(container_id)

    print(f"Container ID: {container_id}")

    # Create cgroup with limits
    cgroup.create(memory_limit_mb=memory_mb, cpu_shares=cpu_shares)

    pid = os.fork()

    if pid == 0:
        # Child process
        try:
            # Create namespaces
            os.unshare(os.CLONE_NEWPID | os.CLONE_NEWUTS | os.CLONE_NEWNS)

            # Set hostname
            subprocess.run(['hostname', f'container-{container_id}'],
                         stderr=subprocess.DEVNULL)

            print(f"Container process started (PID: {os.getpid()})")

            # Execute command
            os.execvp(command[0], command)

        except Exception as e:
            print(f"Error in container: {e}")
            sys.exit(1)
    else:
        # Parent process
        try:
            # Add container process to cgroup
            cgroup.add_process(pid)

            # Wait for container to exit
            os.waitpid(pid, 0)

        except KeyboardInterrupt:
            print("\nContainer interrupted")
        finally:
            # Cleanup cgroup
            cgroup.cleanup()
            print("Container exited")

if __name__ == "__main__":
    if os.geteuid() != 0:
        print("This script requires root privileges")
        sys.exit(1)

    if len(sys.argv) < 2:
        print("Usage: sudo python3 container_v3.py <command> [memory_mb] [cpu_shares]")
        print("Example: sudo python3 container_v3.py bash 100 512")
        sys.exit(1)

    command = sys.argv[1:-2] if len(sys.argv) > 3 else [sys.argv[1]]
    memory_mb = int(sys.argv[-2]) if len(sys.argv) > 2 else 100
    cpu_shares = int(sys.argv[-1]) if len(sys.argv) > 3 else 512

    run_container_with_limits(command, memory_mb, cpu_shares)
```

To test the memory limit, inside the container try:
```bash
# This Python one-liner will try to allocate memory until it hits the limit
python3 -c "a = ['x' * 1024 * 1024 for i in range(200)]"
```

The process should be killed when it exceeds the memory limit!

### Step 4: Complete Container Runtime

Now let's put everything together into a complete, production-like container runtime:

```python
#!/usr/bin/env python3
"""
A minimal container runtime implementation in Python.
Demonstrates how Docker-like containers work under the hood.

Usage:
    sudo python3 container.py run <image_dir> <command>

Example:
    sudo python3 container.py run ./alpine bash
"""

import os
import sys
import subprocess
import shutil
import uuid
import argparse
from pathlib import Path

class Container:
    """Represents a running container with full isolation."""

    def __init__(self, image_dir, command, memory_mb=512, cpu_shares=1024):
        self.id = str(uuid.uuid4())[:12]
        self.image_dir = Path(image_dir).resolve()
        self.command = command
        self.memory_mb = memory_mb
        self.cpu_shares = cpu_shares
        self.cgroup_path = f"/sys/fs/cgroup/container_{self.id}"

    def setup_cgroup(self):
        """Create and configure cgroup for resource limits."""
        try:
            os.makedirs(self.cgroup_path, exist_ok=True)

            # Memory limit
            with open(f"{self.cgroup_path}/memory.max", 'w') as f:
                f.write(str(self.memory_mb * 1024 * 1024))

            # CPU limit
            cpu_quota = int((self.cpu_shares / 1024) * 100000)
            with open(f"{self.cgroup_path}/cpu.max", 'w') as f:
                f.write(f"{cpu_quota} 100000")

            print(f"[{self.id}] Resource limits: {self.memory_mb}MB RAM, {self.cpu_shares}/1024 CPU")
        except Exception as e:
            print(f"Warning: Could not set cgroups: {e}")

    def setup_network(self):
        """
        Setup network namespace and virtual network interface.
        In a real implementation, this would create veth pairs,
        bridges, and configure iptables for NAT.
        """
        try:
            # Create new network namespace
            os.unshare(os.CLONE_NEWNET)

            # Bring up loopback interface
            subprocess.run(['ip', 'link', 'set', 'lo', 'up'],
                         stderr=subprocess.DEVNULL)

            print(f"[{self.id}] Network namespace created")
        except Exception as e:
            print(f"Warning: Could not setup network: {e}")

    def setup_filesystem(self):
        """Setup isolated filesystem with mount namespace."""
        try:
            # Ensure image directory exists
            if not self.image_dir.exists():
                raise Exception(f"Image directory not found: {self.image_dir}")

            # Create mount namespace
            os.unshare(os.CLONE_NEWNS)

            # Remount everything private to avoid propagation
            subprocess.run(['mount', '--make-rprivate', '/'],
                         stderr=subprocess.DEVNULL)

            # Change to the container's root
            os.chroot(str(self.image_dir))
            os.chdir('/')

            # Mount essential filesystems
            os.makedirs('/proc', exist_ok=True)
            subprocess.run(['mount', '-t', 'proc', 'proc', '/proc'],
                         stderr=subprocess.DEVNULL)

            os.makedirs('/sys', exist_ok=True)
            subprocess.run(['mount', '-t', 'sysfs', 'sys', '/sys'],
                         stderr=subprocess.DEVNULL)

            os.makedirs('/dev', exist_ok=True)
            subprocess.run(['mount', '-t', 'devtmpfs', 'dev', '/dev'],
                         stderr=subprocess.DEVNULL)

            os.makedirs('/tmp', exist_ok=True)
            subprocess.run(['mount', '-t', 'tmpfs', 'tmpfs', '/tmp'],
                         stderr=subprocess.DEVNULL)

            print(f"[{self.id}] Filesystem isolated (root: {self.image_dir})")
        except Exception as e:
            raise Exception(f"Failed to setup filesystem: {e}")

    def run(self):
        """Run the container."""
        print(f"[{self.id}] Starting container...")
        print(f"[{self.id}] Command: {' '.join(self.command)}")

        # Setup cgroup first
        self.setup_cgroup()

        pid = os.fork()

        if pid == 0:
            # Child process - this becomes the container
            try:
                # Create new namespaces
                os.unshare(
                    os.CLONE_NEWPID |   # Process isolation
                    os.CLONE_NEWNS |    # Mount isolation
                    os.CLONE_NEWUTS |   # Hostname isolation
                    os.CLONE_NEWIPC     # IPC isolation
                )

                # Fork again to become PID 1 in the new namespace
                container_pid = os.fork()

                if container_pid == 0:
                    # Grandchild - this is PID 1 in the container

                    # Set hostname
                    subprocess.run(['hostname', f'container-{self.id}'],
                                 stderr=subprocess.DEVNULL)

                    # Setup filesystem
                    self.setup_filesystem()

                    # Setup network
                    self.setup_network()

                    # Set environment
                    os.environ['HOSTNAME'] = f'container-{self.id}'
                    os.environ['PATH'] = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'

                    print(f"[{self.id}] Container ready!")
                    print("="*60)

                    # Execute the command
                    os.execvp(self.command[0], self.command)
                else:
                    # Child process - wait for grandchild
                    os.waitpid(container_pid, 0)
                    sys.exit(0)

            except Exception as e:
                print(f"[{self.id}] Error: {e}")
                sys.exit(1)
        else:
            # Parent process
            try:
                # Add container to cgroup
                with open(f"{self.cgroup_path}/cgroup.procs", 'w') as f:
                    f.write(str(pid))

                # Wait for container to exit
                os.waitpid(pid, 0)

            except KeyboardInterrupt:
                print(f"\n[{self.id}] Interrupted")
            finally:
                self.cleanup()

    def cleanup(self):
        """Cleanup container resources."""
        try:
            os.rmdir(self.cgroup_path)
        except Exception:
            pass
        print(f"[{self.id}] Container stopped")

def main():
    parser = argparse.ArgumentParser(
        description='A minimal container runtime',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  sudo python3 container.py run /path/to/rootfs bash
  sudo python3 container.py run ./alpine sh -c "echo hello from container"
  sudo python3 container.py run ./ubuntu bash --memory 256 --cpu 512
        """
    )

    parser.add_argument('action', choices=['run'], help='Action to perform')
    parser.add_argument('image', help='Path to root filesystem')
    parser.add_argument('command', nargs='+', help='Command to run in container')
    parser.add_argument('--memory', type=int, default=512,
                       help='Memory limit in MB (default: 512)')
    parser.add_argument('--cpu', type=int, default=1024,
                       help='CPU shares (default: 1024 = 1 CPU)')

    args = parser.parse_args()

    # Check root
    if os.geteuid() != 0:
        print("Error: This program requires root privileges")
        print("Run with: sudo python3 container.py ...")
        sys.exit(1)

    if args.action == 'run':
        container = Container(
            args.image,
            args.command,
            memory_mb=args.memory,
            cpu_shares=args.cpu
        )
        container.run()

if __name__ == "__main__":
    main()
```

## Testing Your Container Runtime

To test this, you'll need a root filesystem. Here's how to create a minimal one using an existing Docker image:

```bash
# Create a directory for our container image
mkdir alpine_rootfs

# Export an Alpine Linux filesystem (requires Docker)
docker export $(docker create alpine:latest) | tar -C alpine_rootfs -xf -

# Or download a minimal rootfs
wget https://dl-cdn.alpinelinux.org/alpine/v3.18/releases/x86_64/alpine-minirootfs-3.18.0-x86_64.tar.gz
mkdir alpine_rootfs
tar -xzf alpine-minirootfs-3.18.0-x86_64.tar.gz -C alpine_rootfs

# Now run your container!
sudo python3 container.py run alpine_rootfs sh
```

Inside the container, you can verify isolation:

```bash
# Check hostname
hostname  # Should show container-<id>

# Check processes (only container processes)
ps aux

# Check filesystem (should only see alpine files)
ls /

# Check resource limits
cat /sys/fs/cgroup/memory.max
```

## What We Built vs. What Docker Does

Our container runtime demonstrates the core concepts, but production container runtimes like Docker/containerd do much more:

**What we built:**
- Process isolation (PID namespaces)
- Filesystem isolation (mount namespaces + chroot)
- Resource limits (cgroups v2)
- Basic network isolation
- Hostname isolation (UTS namespace)

**What Docker adds:**
- **Image Management**: Layered filesystems using overlay2/AUFS
- **Image Distribution**: Pulling images from registries
- **Advanced Networking**: Bridge networks, overlay networks, port mapping
- **Volume Management**: Persistent storage with bind mounts and volumes
- **Security Features**: seccomp profiles, AppArmor/SELinux, capability dropping
- **Container Orchestration APIs**: REST API for managing containers
- **Logging & Monitoring**: stdout/stderr capture, metrics collection
- **Health Checks**: Container health monitoring
- **Restart Policies**: Automatic restart on failure

## Understanding the Security Implications

It's crucial to understand that our simple implementation lacks many security features:

1. **No User Namespaces**: Our containers run as root. Production containers should use user namespaces to map container root to unprivileged users.

2. **No seccomp**: We don't restrict system calls. Docker uses seccomp profiles to block dangerous syscalls.

3. **No Capability Dropping**: Our containers have all Linux capabilities. Docker drops most by default.

4. **No AppArmor/SELinux**: No mandatory access control.

These missing features are why you should never use our implementation in production!

## Conclusion

By building this container runtime, we've demystified how containers actually work. They're not magic - they're clever applications of Linux kernel features that have existed for years:

- **Namespaces** (2002-2013): Provide isolation
- **cgroups** (2007): Provide resource limiting
- **chroot** (1979!): Provides filesystem isolation

Docker's innovation wasn't inventing these technologies - it was packaging them into an easy-to-use tool with great developer experience.

Understanding these fundamentals makes you a better DevOps engineer. When things go wrong in production, you'll know where to look. When you need to optimize container performance, you'll understand the levers you can pull.

## Further Learning

If you enjoyed this deep dive, here are resources to continue learning:

- **Linux Namespaces**: `man namespaces`, `man unshare`
- **cgroups**: [Kernel cgroups documentation](https://www.kernel.org/doc/Documentation/cgroup-v2.txt)
- **OCI Runtime Spec**: The standard container runtime specification
- **runc Source Code**: Docker's actual container runtime
- **LXC/LXD**: Linux containers project - the original container tech

I also highly recommend [CodeCrafters' "Build Your Own Docker" challenge](https://app.codecrafters.io/join?via=mraza007) - it's an interactive way to build a container runtime with guided steps and automatic testing.

## Next Steps

In a future post, I might explore:
- Implementing container image layers with overlay filesystems
- Building container networking from scratch (veth pairs, bridges, NAT)
- Creating a simple container orchestrator (mini-Kubernetes)

Let me know in the comments what you'd like to see next!

---

#### Announcements

- If you're interested in more content like this, I post regularly about DevOps, Python, and systems programming. Follow me on [Twitter/X](https://twitter.com/muhammad_o7) for updates.
- I'm available for Python and DevOps consulting. If you need help with containerization, automation, or infrastructure, feel free to reach out via [email](mailto:muhammadraza0047@gmail.com).

<br>
_If you found this post valuable, you can [buy me a coffee](https://www.buymeacoffee.com/mraza007) to support my work. If you share this on X, tag me [@muhammad_o7](https://twitter.com/muhammad_o7) - I'd love to see your thoughts! You can also connect with me on [LinkedIn](https://www.linkedin.com/in/muhammad-raza-07/)._

**Note: Want to be notified about posts like this? Subscribe to my RSS feed or leave your email [here](https://forms.gle/M1EK61LLCxJ3iTiD7)**
