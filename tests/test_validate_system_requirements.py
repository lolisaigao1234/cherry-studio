#!/usr/bin/env python3
"""
Unit Tests for System Requirements Validator
Cherry Studio - Strawberrylemonade-L3-70B-v1.1 Integration

Tests all functions in validate_system_requirements.py with mocked hardware data.

Author: Cherry Studio Integration Team
Version: 1.0.0
"""

import json
import sys
import tempfile
import unittest
from dataclasses import asdict
from pathlib import Path
from unittest.mock import MagicMock, Mock, mock_open, patch

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'scripts'))

from validate_system_requirements import (
    CPUInfo,
    GPUInfo,
    MemoryInfo,
    StorageInfo,
    SystemReport,
    SystemValidator,
)


class TestDataClasses(unittest.TestCase):
    """Test data class creation and serialization"""

    def test_cpu_info_creation(self):
        """Test CPUInfo dataclass creation"""
        cpu = CPUInfo(
            model="AMD Ryzen 7 7700X",
            cores=8,
            threads=16,
            architecture="x86_64",
            meets_minimum=True,
            meets_recommended=False
        )

        self.assertEqual(cpu.model, "AMD Ryzen 7 7700X")
        self.assertEqual(cpu.cores, 8)
        self.assertEqual(cpu.threads, 16)
        self.assertTrue(cpu.meets_minimum)
        self.assertFalse(cpu.meets_recommended)

    def test_memory_info_creation(self):
        """Test MemoryInfo dataclass creation"""
        memory = MemoryInfo(
            total_gb=32.0,
            available_gb=28.5,
            meets_minimum=True,
            meets_recommended=False
        )

        self.assertEqual(memory.total_gb, 32.0)
        self.assertEqual(memory.available_gb, 28.5)
        self.assertTrue(memory.meets_minimum)

    def test_gpu_info_creation(self):
        """Test GPUInfo dataclass creation"""
        gpu = GPUInfo(
            name="NVIDIA RTX 5090",
            vram_gb=32.0,
            cuda_version="12.6",
            driver_version="560.35",
            compute_capability="9.0",
            is_available=True,
            recommended_quantization="Q6_K or Q8_0 (full GPU offload)"
        )

        self.assertEqual(gpu.name, "NVIDIA RTX 5090")
        self.assertEqual(gpu.vram_gb, 32.0)
        self.assertTrue(gpu.is_available)

    def test_storage_info_creation(self):
        """Test StorageInfo dataclass creation"""
        storage = StorageInfo(
            total_gb=500.0,
            available_gb=200.0,
            meets_minimum=True,
            filesystem="ext4"
        )

        self.assertEqual(storage.total_gb, 500.0)
        self.assertEqual(storage.available_gb, 200.0)
        self.assertTrue(storage.meets_minimum)

    def test_system_report_serialization(self):
        """Test SystemReport can be serialized to JSON"""
        cpu = CPUInfo("Test CPU", 8, 16, "x86_64", True, False)
        memory = MemoryInfo(32.0, 28.0, True, False)
        gpu = GPUInfo("Test GPU", 24.0, "12.0", "550.0", "8.9", True, "Q5_K_M")
        storage = StorageInfo(500.0, 200.0, True, "ext4")

        report = SystemReport(
            cpu=cpu,
            memory=memory,
            gpu=gpu,
            storage=storage,
            overall_status="PASSED",
            recommendations=["Test recommendation"],
            warnings=[],
            timestamp="2025-01-01T00:00:00"
        )

        # Convert to dict and then to JSON
        report_dict = asdict(report)
        json_str = json.dumps(report_dict)

        # Should not raise exception
        self.assertIsInstance(json_str, str)
        self.assertIn("Test CPU", json_str)


class TestSystemValidator(unittest.TestCase):
    """Test SystemValidator class methods"""

    def setUp(self):
        """Set up test fixtures"""
        self.validator = SystemValidator(target_dir="/tmp")

    def test_validator_initialization(self):
        """Test SystemValidator initializes correctly"""
        self.assertIsInstance(self.validator, SystemValidator)
        self.assertEqual(self.validator.MIN_CPU_CORES, 8)
        self.assertEqual(self.validator.MIN_RAM_GB, 32)
        self.assertEqual(self.validator.MIN_STORAGE_GB, 50)

    @patch('builtins.open', new_callable=mock_open, read_data="""
processor\t: 0
model name\t: AMD Ryzen 7 7700X 8-Core Processor
processor\t: 1
model name\t: AMD Ryzen 7 7700X 8-Core Processor
""")
    @patch('subprocess.check_output')
    @patch('platform.machine')
    @patch('platform.system')
    def test_get_cpu_info_linux(self, mock_system, mock_machine, mock_subprocess, mock_file):
        """Test CPU info retrieval on Linux"""
        mock_system.return_value = "Linux"
        mock_machine.return_value = "x86_64"
        mock_subprocess.return_value = b"16\n"  # 16 logical CPUs

        cpu = self.validator.get_cpu_info()

        self.assertEqual(cpu.cores, 16)
        self.assertIn("AMD Ryzen 7 7700X", cpu.model)
        self.assertEqual(cpu.architecture, "x86_64")

    @patch('builtins.open', new_callable=mock_open, read_data="""
MemTotal:       32000000 kB
MemAvailable:   28000000 kB
""")
    @patch('platform.system')
    def test_get_memory_info_linux(self, mock_system, mock_file):
        """Test memory info retrieval on Linux"""
        mock_system.return_value = "Linux"

        memory = self.validator.get_memory_info()

        # 32000000 kB = ~30.5 GB
        self.assertGreater(memory.total_gb, 30)
        self.assertLess(memory.total_gb, 32)
        self.assertGreater(memory.available_gb, 26)

    @patch('subprocess.run')
    def test_get_gpu_info_nvidia_available(self, mock_run):
        """Test GPU info when NVIDIA GPU is available"""
        # Mock nvidia-smi output
        mock_result1 = Mock()
        mock_result1.stdout = "NVIDIA RTX 5090, 32768, 560.35"
        mock_result1.returncode = 0

        mock_result2 = Mock()
        mock_result2.stdout = "CUDA Version: 12.6"
        mock_result2.returncode = 0

        mock_result3 = Mock()
        mock_result3.stdout = "9.0"
        mock_result3.returncode = 0

        mock_run.side_effect = [mock_result1, mock_result2, mock_result3]

        gpu = self.validator.get_gpu_info()

        self.assertIsNotNone(gpu)
        self.assertEqual(gpu.name, "NVIDIA RTX 5090")
        self.assertEqual(gpu.vram_gb, 32.0)
        self.assertTrue(gpu.is_available)
        self.assertIn("Q6_K", gpu.recommended_quantization)

    @patch('subprocess.run')
    def test_get_gpu_info_no_nvidia(self, mock_run):
        """Test GPU info when no NVIDIA GPU is present"""
        mock_run.side_effect = subprocess.CalledProcessError(1, 'nvidia-smi')

        gpu = self.validator.get_gpu_info()

        self.assertIsNone(gpu)

    @patch('os.statvfs')
    @patch('platform.system')
    def test_get_storage_info_linux(self, mock_system, mock_statvfs):
        """Test storage info retrieval on Linux"""
        mock_system.return_value = "Linux"

        # Mock statvfs result
        mock_stat = Mock()
        mock_stat.f_blocks = 500 * (1024**3) // 4096  # 500GB / block_size
        mock_stat.f_bavail = 200 * (1024**3) // 4096  # 200GB available
        mock_stat.f_frsize = 4096

        mock_statvfs.return_value = mock_stat

        storage = self.validator.get_storage_info()

        self.assertGreater(storage.total_gb, 450)
        self.assertGreater(storage.available_gb, 180)
        self.assertTrue(storage.meets_minimum)

    def test_validate_optimal_system(self):
        """Test validation with optimal system specs (RTX 5090)"""
        # Mock all hardware getters
        with patch.object(self.validator, 'get_cpu_info') as mock_cpu, \
             patch.object(self.validator, 'get_memory_info') as mock_memory, \
             patch.object(self.validator, 'get_gpu_info') as mock_gpu, \
             patch.object(self.validator, 'get_storage_info') as mock_storage:

            # Optimal specs
            mock_cpu.return_value = CPUInfo(
                model="AMD Ryzen 7 7700X",
                cores=8,
                threads=16,
                architecture="x86_64",
                meets_minimum=True,
                meets_recommended=False
            )
            mock_memory.return_value = MemoryInfo(
                total_gb=32.0,
                available_gb=28.0,
                meets_minimum=True,
                meets_recommended=False
            )
            mock_gpu.return_value = GPUInfo(
                name="NVIDIA RTX 5090",
                vram_gb=32.0,
                cuda_version="12.6",
                driver_version="560.35",
                compute_capability="9.0",
                is_available=True,
                recommended_quantization="Q6_K or Q8_0 (full GPU offload)"
            )
            mock_storage.return_value = StorageInfo(
                total_gb=500.0,
                available_gb=200.0,
                meets_minimum=True,
                filesystem="ext4"
            )

            report = self.validator.validate()

            self.assertEqual(report.overall_status, "PASSED")
            self.assertIn("Q6_K", "\n".join(report.recommendations))
            self.assertEqual(len(report.warnings), 0)

    def test_validate_insufficient_ram(self):
        """Test validation with insufficient RAM"""
        with patch.object(self.validator, 'get_cpu_info') as mock_cpu, \
             patch.object(self.validator, 'get_memory_info') as mock_memory, \
             patch.object(self.validator, 'get_gpu_info') as mock_gpu, \
             patch.object(self.validator, 'get_storage_info') as mock_storage:

            mock_cpu.return_value = CPUInfo("Test CPU", 8, 16, "x86_64", True, False)
            mock_memory.return_value = MemoryInfo(
                total_gb=16.0,  # Insufficient!
                available_gb=14.0,
                meets_minimum=False,
                meets_recommended=False
            )
            mock_gpu.return_value = None
            mock_storage.return_value = StorageInfo(500.0, 200.0, True, "ext4")

            report = self.validator.validate()

            self.assertEqual(report.overall_status, "FAILED")
            self.assertGreater(len(report.warnings), 0)
            self.assertTrue(any("RAM" in w for w in report.warnings))

    def test_validate_no_gpu_warning(self):
        """Test validation issues warning when no GPU present"""
        with patch.object(self.validator, 'get_cpu_info') as mock_cpu, \
             patch.object(self.validator, 'get_memory_info') as mock_memory, \
             patch.object(self.validator, 'get_gpu_info') as mock_gpu, \
             patch.object(self.validator, 'get_storage_info') as mock_storage:

            mock_cpu.return_value = CPUInfo("Test CPU", 8, 16, "x86_64", True, False)
            mock_memory.return_value = MemoryInfo(32.0, 28.0, True, False)
            mock_gpu.return_value = None  # No GPU
            mock_storage.return_value = StorageInfo(500.0, 200.0, True, "ext4")

            report = self.validator.validate()

            self.assertEqual(report.overall_status, "PASSED_WITH_WARNINGS")
            self.assertTrue(any("GPU" in w for w in report.warnings))

    def test_save_report(self):
        """Test saving report to JSON file"""
        cpu = CPUInfo("Test CPU", 8, 16, "x86_64", True, False)
        memory = MemoryInfo(32.0, 28.0, True, False)
        gpu = None
        storage = StorageInfo(500.0, 200.0, True, "ext4")

        report = SystemReport(
            cpu=cpu,
            memory=memory,
            gpu=gpu,
            storage=storage,
            overall_status="PASSED_WITH_WARNINGS",
            recommendations=["Add GPU"],
            warnings=["No GPU detected"],
            timestamp="2025-01-01T00:00:00"
        )

        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
            temp_path = f.name

        try:
            self.validator.save_report(report, output_path=temp_path)

            # Verify file was created and contains valid JSON
            with open(temp_path, 'r') as f:
                loaded_data = json.load(f)

            self.assertEqual(loaded_data['overall_status'], "PASSED_WITH_WARNINGS")
            self.assertEqual(loaded_data['cpu']['cores'], 8)
            self.assertIsNone(loaded_data['gpu'])

        finally:
            Path(temp_path).unlink(missing_ok=True)


class TestQuantizationRecommendations(unittest.TestCase):
    """Test quantization recommendations based on VRAM"""

    def setUp(self):
        self.validator = SystemValidator()

    def test_q8_recommendation_for_32gb_vram(self):
        """Test Q6_K/Q8_0 recommended for 32GB VRAM (RTX 5090)"""
        with patch('subprocess.run') as mock_run:
            mock_result1 = Mock()
            mock_result1.stdout = "NVIDIA RTX 5090, 32768, 560.35"
            mock_result2 = Mock()
            mock_result2.stdout = "CUDA Version: 12.6"
            mock_result3 = Mock()
            mock_result3.stdout = "9.0"

            mock_run.side_effect = [mock_result1, mock_result2, mock_result3]

            gpu = self.validator.get_gpu_info()

            self.assertIn("Q6_K or Q8_0", gpu.recommended_quantization)

    def test_q5_recommendation_for_24gb_vram(self):
        """Test Q5_K_M recommended for 24GB VRAM"""
        with patch('subprocess.run') as mock_run:
            mock_result1 = Mock()
            mock_result1.stdout = "NVIDIA RTX 4090, 24576, 550.35"
            mock_result2 = Mock()
            mock_result2.stdout = "CUDA Version: 12.3"
            mock_result3 = Mock()
            mock_result3.stdout = "8.9"

            mock_run.side_effect = [mock_result1, mock_result2, mock_result3]

            gpu = self.validator.get_gpu_info()

            self.assertIn("Q5_K_M", gpu.recommended_quantization)

    def test_q4_recommendation_for_16gb_vram(self):
        """Test Q4_K_M recommended for 16GB VRAM"""
        with patch('subprocess.run') as mock_run:
            mock_result1 = Mock()
            mock_result1.stdout = "NVIDIA RTX 4060 Ti, 16384, 545.23"
            mock_result2 = Mock()
            mock_result2.stdout = "CUDA Version: 12.2"
            mock_result3 = Mock()
            mock_result3.stdout = "8.9"

            mock_run.side_effect = [mock_result1, mock_result2, mock_result3]

            gpu = self.validator.get_gpu_info()

            self.assertIn("Q4_K_M", gpu.recommended_quantization)


class TestIntegration(unittest.TestCase):
    """Integration tests for complete validation flow"""

    def test_full_validation_workflow(self):
        """Test complete validation workflow"""
        validator = SystemValidator(target_dir="/tmp")

        # Mock optimal system
        with patch.object(validator, 'get_cpu_info') as mock_cpu, \
             patch.object(validator, 'get_memory_info') as mock_memory, \
             patch.object(validator, 'get_gpu_info') as mock_gpu, \
             patch.object(validator, 'get_storage_info') as mock_storage:

            mock_cpu.return_value = CPUInfo("AMD Ryzen 7 7700X", 8, 16, "x86_64", True, False)
            mock_memory.return_value = MemoryInfo(32.0, 28.0, True, False)
            mock_gpu.return_value = GPUInfo(
                "NVIDIA RTX 5090", 32.0, "12.6", "560.35", "9.0", True,
                "Q6_K or Q8_0 (full GPU offload)"
            )
            mock_storage.return_value = StorageInfo(500.0, 200.0, True, "ext4")

            # Run validation
            report = validator.validate()

            # Should pass
            self.assertEqual(report.overall_status, "PASSED")

            # Save report
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
                temp_path = f.name

            try:
                validator.save_report(report, output_path=temp_path)

                # Load and verify
                with open(temp_path, 'r') as f:
                    data = json.load(f)

                self.assertEqual(data['cpu']['model'], "AMD Ryzen 7 7700X")
                self.assertEqual(data['gpu']['vram_gb'], 32.0)

            finally:
                Path(temp_path).unlink(missing_ok=True)


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
