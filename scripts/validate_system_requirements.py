#!/usr/bin/env python3
"""
System Requirements Validator for Strawberrylemonade-L3-70B-v1.1
Cherry Studio Integration - Phase 0

This script validates that the system meets hardware requirements
for deploying the 70B model via Ollama.

Target Hardware:
- CPU: AMD Ryzen 7 7700X (8C/16T)
- RAM: 32GB DDR5-6000
- GPU: NVIDIA RTX 5090 (32GB VRAM)
- Storage: 150GB+

Author: Cherry Studio Integration Team
Version: 1.0.0
"""

import json
import os
import platform
import subprocess
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple


@dataclass
class CPUInfo:
    """CPU information container"""
    model: str
    cores: int
    threads: int
    architecture: str
    meets_minimum: bool
    meets_recommended: bool


@dataclass
class MemoryInfo:
    """Memory information container"""
    total_gb: float
    available_gb: float
    meets_minimum: bool
    meets_recommended: bool


@dataclass
class GPUInfo:
    """GPU information container"""
    name: str
    vram_gb: float
    cuda_version: str
    driver_version: str
    compute_capability: str
    is_available: bool
    recommended_quantization: str


@dataclass
class StorageInfo:
    """Storage information container"""
    total_gb: float
    available_gb: float
    meets_minimum: bool
    filesystem: str


@dataclass
class SystemReport:
    """Complete system validation report"""
    cpu: CPUInfo
    memory: MemoryInfo
    gpu: Optional[GPUInfo]
    storage: StorageInfo
    overall_status: str
    recommendations: List[str]
    warnings: List[str]
    timestamp: str


class SystemValidator:
    """Validates system requirements for 70B model deployment"""

    # Requirements for Strawberrylemonade-L3-70B-v1.1
    MIN_CPU_CORES = 8
    RECOMMENDED_CPU_CORES = 12
    MIN_RAM_GB = 32
    RECOMMENDED_RAM_GB = 40
    MIN_STORAGE_GB = 50
    MIN_VRAM_GB = 16
    RECOMMENDED_VRAM_GB = 24
    OPTIMAL_VRAM_GB = 32  # For Q6_K full offload

    def __init__(self, target_dir: str = "."):
        """Initialize validator with target directory for storage check"""
        self.target_dir = Path(target_dir).resolve()

    def get_cpu_info(self) -> CPUInfo:
        """Retrieve CPU information"""
        try:
            if platform.system() == "Linux":
                # Get CPU model
                with open('/proc/cpuinfo', 'r') as f:
                    cpuinfo = f.read()

                model_lines = [line for line in cpuinfo.split('\n') if 'model name' in line]
                model = model_lines[0].split(':')[1].strip() if model_lines else "Unknown"

                # Get core and thread count
                cores = int(subprocess.check_output(['nproc', '--all']).decode().strip())

                # Get threads (logical CPUs)
                threads = cores  # nproc returns logical CPUs
                physical_cores = cores // 2  # Estimate (may not be accurate)

                # Get architecture
                arch = platform.machine()

            elif platform.system() == "Windows":
                # Windows implementation
                import wmi
                w = wmi.WMI()
                cpu = w.Win32_Processor()[0]
                model = cpu.Name
                cores = cpu.NumberOfCores
                threads = cpu.NumberOfLogicalProcessors
                arch = platform.machine()

            else:  # macOS
                model = subprocess.check_output(['sysctl', '-n', 'machdep.cpu.brand_string']).decode().strip()
                cores = int(subprocess.check_output(['sysctl', '-n', 'hw.physicalcpu']).decode().strip())
                threads = int(subprocess.check_output(['sysctl', '-n', 'hw.logicalcpu']).decode().strip())
                arch = platform.machine()

            return CPUInfo(
                model=model,
                cores=cores,
                threads=threads,
                architecture=arch,
                meets_minimum=cores >= self.MIN_CPU_CORES,
                meets_recommended=cores >= self.RECOMMENDED_CPU_CORES
            )

        except Exception as e:
            print(f"Warning: Could not get CPU info: {e}", file=sys.stderr)
            return CPUInfo(
                model="Unknown",
                cores=0,
                threads=0,
                architecture=platform.machine(),
                meets_minimum=False,
                meets_recommended=False
            )

    def get_memory_info(self) -> MemoryInfo:
        """Retrieve memory information"""
        try:
            if platform.system() == "Linux":
                with open('/proc/meminfo', 'r') as f:
                    meminfo = f.read()

                total_kb = int([line for line in meminfo.split('\n') if 'MemTotal' in line][0].split()[1])
                available_kb = int([line for line in meminfo.split('\n') if 'MemAvailable' in line][0].split()[1])

                total_gb = total_kb / (1024 ** 2)
                available_gb = available_kb / (1024 ** 2)

            elif platform.system() == "Windows":
                import wmi
                w = wmi.WMI()
                os_info = w.Win32_OperatingSystem()[0]
                total_bytes = int(os_info.TotalVisibleMemorySize) * 1024
                available_bytes = int(os_info.FreePhysicalMemory) * 1024

                total_gb = total_bytes / (1024 ** 3)
                available_gb = available_bytes / (1024 ** 3)

            else:  # macOS
                total_bytes = int(subprocess.check_output(['sysctl', '-n', 'hw.memsize']).decode().strip())
                # Note: Getting available memory on macOS is more complex
                total_gb = total_bytes / (1024 ** 3)
                available_gb = total_gb * 0.7  # Estimate

            return MemoryInfo(
                total_gb=round(total_gb, 2),
                available_gb=round(available_gb, 2),
                meets_minimum=total_gb >= self.MIN_RAM_GB,
                meets_recommended=total_gb >= self.RECOMMENDED_RAM_GB
            )

        except Exception as e:
            print(f"Warning: Could not get memory info: {e}", file=sys.stderr)
            return MemoryInfo(
                total_gb=0,
                available_gb=0,
                meets_minimum=False,
                meets_recommended=False
            )

    def get_gpu_info(self) -> Optional[GPUInfo]:
        """Retrieve NVIDIA GPU information"""
        try:
            # Check if nvidia-smi is available
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=name,memory.total,driver_version',
                 '--format=csv,noheader,nounits'],
                capture_output=True,
                text=True,
                check=True
            )

            gpu_data = result.stdout.strip().split(', ')
            name = gpu_data[0]
            vram_mb = float(gpu_data[1])
            vram_gb = round(vram_mb / 1024, 2)
            driver_version = gpu_data[2]

            # Get CUDA version
            cuda_result = subprocess.run(
                ['nvidia-smi'],
                capture_output=True,
                text=True,
                check=True
            )
            cuda_lines = [line for line in cuda_result.stdout.split('\n') if 'CUDA Version' in line]
            cuda_version = cuda_lines[0].split('CUDA Version:')[1].strip().split()[0] if cuda_lines else "Unknown"

            # Get compute capability (requires nvcc or deviceQuery)
            try:
                nvcc_result = subprocess.run(
                    ['nvidia-smi', '--query-gpu=compute_cap', '--format=csv,noheader'],
                    capture_output=True,
                    text=True,
                    check=True
                )
                compute_capability = nvcc_result.stdout.strip()
            except:
                compute_capability = "Unknown"

            # Determine recommended quantization based on VRAM
            if vram_gb >= self.OPTIMAL_VRAM_GB:
                recommended_quant = "Q6_K or Q8_0 (full GPU offload)"
            elif vram_gb >= self.RECOMMENDED_VRAM_GB:
                recommended_quant = "Q5_K_M (full GPU offload)"
            elif vram_gb >= self.MIN_VRAM_GB:
                recommended_quant = "Q4_K_M (partial GPU offload)"
            else:
                recommended_quant = "Q4_K_M (CPU-heavy, limited GPU)"

            return GPUInfo(
                name=name,
                vram_gb=vram_gb,
                cuda_version=cuda_version,
                driver_version=driver_version,
                compute_capability=compute_capability,
                is_available=True,
                recommended_quantization=recommended_quant
            )

        except subprocess.CalledProcessError:
            # nvidia-smi not available or failed
            return None
        except Exception as e:
            print(f"Warning: Could not get GPU info: {e}", file=sys.stderr)
            return None

    def get_storage_info(self) -> StorageInfo:
        """Retrieve storage information for target directory"""
        try:
            if platform.system() == "Windows":
                import ctypes
                free_bytes = ctypes.c_ulonglong(0)
                total_bytes = ctypes.c_ulonglong(0)
                ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                    str(self.target_dir), None, ctypes.byref(total_bytes), ctypes.byref(free_bytes)
                )
                total_gb = total_bytes.value / (1024 ** 3)
                available_gb = free_bytes.value / (1024 ** 3)
                filesystem = "NTFS"
            else:
                stat = os.statvfs(self.target_dir)
                total_gb = (stat.f_blocks * stat.f_frsize) / (1024 ** 3)
                available_gb = (stat.f_bavail * stat.f_frsize) / (1024 ** 3)

                # Get filesystem type (Linux only)
                if platform.system() == "Linux":
                    try:
                        fs_result = subprocess.run(
                            ['df', '-T', str(self.target_dir)],
                            capture_output=True,
                            text=True
                        )
                        filesystem = fs_result.stdout.split('\n')[1].split()[1] if fs_result.stdout else "Unknown"
                    except:
                        filesystem = "Unknown"
                else:
                    filesystem = "APFS/HFS+"

            return StorageInfo(
                total_gb=round(total_gb, 2),
                available_gb=round(available_gb, 2),
                meets_minimum=available_gb >= self.MIN_STORAGE_GB,
                filesystem=filesystem
            )

        except Exception as e:
            print(f"Warning: Could not get storage info: {e}", file=sys.stderr)
            return StorageInfo(
                total_gb=0,
                available_gb=0,
                meets_minimum=False,
                filesystem="Unknown"
            )

    def validate(self) -> SystemReport:
        """Perform complete system validation"""
        from datetime import datetime

        cpu = self.get_cpu_info()
        memory = self.get_memory_info()
        gpu = self.get_gpu_info()
        storage = self.get_storage_info()

        warnings = []
        recommendations = []

        # Evaluate CPU
        if not cpu.meets_minimum:
            warnings.append(f"CPU has only {cpu.cores} cores (minimum: {self.MIN_CPU_CORES})")
            recommendations.append("Upgrade to a CPU with at least 8 cores for acceptable performance")
        elif not cpu.meets_recommended:
            recommendations.append(f"CPU has {cpu.cores} cores. 12+ cores recommended for optimal performance")

        # Evaluate Memory
        if not memory.meets_minimum:
            warnings.append(f"RAM is {memory.total_gb}GB (minimum: {self.MIN_RAM_GB}GB)")
            recommendations.append("CRITICAL: Upgrade RAM to at least 32GB to run 70B model")
        elif not memory.meets_recommended:
            recommendations.append(f"RAM is {memory.total_gb}GB. 40GB+ recommended for Q5_K_M or higher")

        # Evaluate GPU
        if gpu is None:
            warnings.append("No NVIDIA GPU detected - will use CPU-only inference (very slow)")
            recommendations.append("Add NVIDIA GPU with 24GB+ VRAM for 10-20x speedup")
        else:
            if gpu.vram_gb < self.MIN_VRAM_GB:
                warnings.append(f"GPU VRAM is {gpu.vram_gb}GB (recommended: {self.RECOMMENDED_VRAM_GB}GB+)")
                recommendations.append("GPU will be underutilized. Consider hybrid CPU/GPU inference")
            elif gpu.vram_gb >= self.OPTIMAL_VRAM_GB:
                recommendations.append(f"Excellent! {gpu.vram_gb}GB VRAM enables Q6_K or Q8_0 quantization")

        # Evaluate Storage
        if not storage.meets_minimum:
            warnings.append(f"Only {storage.available_gb}GB available (minimum: {self.MIN_STORAGE_GB}GB)")
            recommendations.append("Free up disk space or use a larger drive")

        # Determine overall status
        critical_failures = [
            not memory.meets_minimum,
            not storage.meets_minimum,
            not cpu.meets_minimum
        ]

        if any(critical_failures):
            overall_status = "FAILED"
        elif warnings:
            overall_status = "PASSED_WITH_WARNINGS"
        else:
            overall_status = "PASSED"

        return SystemReport(
            cpu=cpu,
            memory=memory,
            gpu=gpu,
            storage=storage,
            overall_status=overall_status,
            recommendations=recommendations,
            warnings=warnings,
            timestamp=datetime.utcnow().isoformat()
        )

    def print_report(self, report: SystemReport) -> None:
        """Print formatted validation report"""
        print("\n" + "=" * 70)
        print("SYSTEM VALIDATION REPORT")
        print("Strawberrylemonade-L3-70B-v1.1 Integration")
        print("=" * 70)
        print(f"\nTimestamp: {report.timestamp}")
        print(f"Overall Status: {report.overall_status}\n")

        # CPU Section
        print("CPU Information:")
        print(f"  Model: {report.cpu.model}")
        print(f"  Cores: {report.cpu.cores} (Physical)")
        print(f"  Threads: {report.cpu.threads} (Logical)")
        print(f"  Architecture: {report.cpu.architecture}")
        status = "✅" if report.cpu.meets_minimum else "❌"
        print(f"  Status: {status} {'Meets minimum' if report.cpu.meets_minimum else 'Below minimum'}")

        # Memory Section
        print(f"\nMemory Information:")
        print(f"  Total: {report.memory.total_gb}GB")
        print(f"  Available: {report.memory.available_gb}GB")
        status = "✅" if report.memory.meets_minimum else "❌"
        print(f"  Status: {status} {'Meets minimum' if report.memory.meets_minimum else 'Below minimum'}")

        # GPU Section
        print(f"\nGPU Information:")
        if report.gpu:
            print(f"  Name: {report.gpu.name}")
            print(f"  VRAM: {report.gpu.vram_gb}GB")
            print(f"  CUDA Version: {report.gpu.cuda_version}")
            print(f"  Driver Version: {report.gpu.driver_version}")
            print(f"  Compute Capability: {report.gpu.compute_capability}")
            print(f"  Recommended Quantization: {report.gpu.recommended_quantization}")
            print(f"  Status: ✅ GPU Available")
        else:
            print(f"  Status: ⚠️  No NVIDIA GPU detected (CPU-only mode)")

        # Storage Section
        print(f"\nStorage Information:")
        print(f"  Total: {report.storage.total_gb}GB")
        print(f"  Available: {report.storage.available_gb}GB")
        print(f"  Filesystem: {report.storage.filesystem}")
        status = "✅" if report.storage.meets_minimum else "❌"
        print(f"  Status: {status} {'Sufficient space' if report.storage.meets_minimum else 'Insufficient space'}")

        # Warnings
        if report.warnings:
            print(f"\n⚠️  WARNINGS:")
            for warning in report.warnings:
                print(f"  - {warning}")

        # Recommendations
        if report.recommendations:
            print(f"\n💡 RECOMMENDATIONS:")
            for rec in report.recommendations:
                print(f"  - {rec}")

        # Final verdict
        print("\n" + "=" * 70)
        if report.overall_status == "PASSED":
            print("✅ SYSTEM VALIDATION PASSED")
            print("Your system meets all requirements for model deployment.")
        elif report.overall_status == "PASSED_WITH_WARNINGS":
            print("⚠️  SYSTEM VALIDATION PASSED WITH WARNINGS")
            print("Your system meets minimum requirements but has limitations.")
        else:
            print("❌ SYSTEM VALIDATION FAILED")
            print("Your system does not meet minimum requirements.")
            print("Please address critical issues before proceeding.")
        print("=" * 70 + "\n")

    def save_report(self, report: SystemReport, output_path: str = "system_validation_report.json") -> None:
        """Save validation report to JSON file"""
        output_file = Path(output_path)
        with output_file.open('w') as f:
            # Convert dataclasses to dict
            report_dict = asdict(report)
            json.dump(report_dict, f, indent=2)
        print(f"Report saved to: {output_file.resolve()}")


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Validate system requirements for Strawberrylemonade-L3-70B-v1.1 deployment"
    )
    parser.add_argument(
        '--target-dir',
        default='.',
        help='Target directory for storage check (default: current directory)'
    )
    parser.add_argument(
        '--output',
        default='system_validation_report.json',
        help='Output file for JSON report (default: system_validation_report.json)'
    )
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Suppress console output (only save to file)'
    )

    args = parser.parse_args()

    validator = SystemValidator(target_dir=args.target_dir)
    report = validator.validate()

    if not args.quiet:
        validator.print_report(report)

    validator.save_report(report, output_path=args.output)

    # Exit with appropriate code
    if report.overall_status == "FAILED":
        sys.exit(1)
    elif report.overall_status == "PASSED_WITH_WARNINGS":
        sys.exit(0)  # Still pass, but with warnings
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
