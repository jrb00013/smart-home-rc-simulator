# Makefile for Phillips Universal Remote Control
# Compatible with both Unix/Linux and Windows (MinGW/MSYS2)

# Compiler settings
CC = gcc
AS = gcc
CFLAGS = -Wall -Wextra -std=c11 -O2 -g
ASFLAGS = -Wall -g
INCLUDES = -Iinclude
LDFLAGS = 

# Simulator support (optional)
# Build with: make SIMULATOR=1
# Use WEB=1 to use web server instead of local IPC: make SIMULATOR=1 WEB=1
ifdef SIMULATOR
    CFLAGS += -DSIMULATOR
    ifdef WEB
        CFLAGS += -DTV_SIMULATOR_WEB
        # Use web server version
        C_SOURCES := $(filter-out $(SRC_DIR)/tv_simulator.c,$(C_SOURCES))
        ifeq ($(OS),Windows_NT)
            LDFLAGS += -lws2_32
        endif
    else
        # Use local IPC version (default)
        C_SOURCES := $(filter-out $(SRC_DIR)/tv_simulator_web.c,$(C_SOURCES))
    endif
    # Windows named pipes don't need extra libraries (kernel32 is linked by default)
    # Unix sockets don't need extra libraries either
endif 

# Platform detection for assembly files and POSIX
UNAME_S := $(shell uname -s 2>/dev/null || echo "Windows")
ifeq ($(UNAME_S),Linux)
    PLATFORM = linux
    CFLAGS += -D_POSIX_C_SOURCE=199309L
endif
ifeq ($(UNAME_S),Darwin)
    PLATFORM = macos
    CFLAGS += -D_POSIX_C_SOURCE=199309L
endif
ifeq ($(OS),Windows_NT)
    PLATFORM = windows
endif

# Detect architecture
ARCH := $(shell uname -m 2>/dev/null || echo "x86_64")
ifeq ($(ARCH),x86_64)
    ASM_FILE = ir_asm_x86.S
endif
ifeq ($(ARCH),i386)
    ASM_FILE = ir_asm_x86.S
endif
ifeq ($(ARCH),i686)
    ASM_FILE = ir_asm_x86.S
endif
ifeq ($(ARCH),armv7l)
    ASM_FILE = ir_asm_arm.s
endif
ifeq ($(ARCH),aarch64)
    ASM_FILE = ir_asm_arm.s
endif

# Directories
SRC_DIR = src
INC_DIR = include
OBJ_DIR = obj
BIN_DIR = bin

# Source files
C_SOURCES = $(wildcard $(SRC_DIR)/*.c)
# Interrupt handler assembly (ISR) only. IR timing uses C fallback for portability.
ASM_SOURCES = $(SRC_DIR)/interrupt_handlers.S

# Exclude simulator source if not enabled
ifndef SIMULATOR
    C_SOURCES := $(filter-out $(SRC_DIR)/tv_simulator.c $(SRC_DIR)/tv_simulator_web.c,$(C_SOURCES))
endif

# Object files
C_OBJECTS = $(C_SOURCES:$(SRC_DIR)/%.c=$(OBJ_DIR)/%.o)
ASM_OBJECTS = $(patsubst $(SRC_DIR)/%.s,$(OBJ_DIR)/%.o,$(filter %.s,$(ASM_SOURCES))) $(patsubst $(SRC_DIR)/%.S,$(OBJ_DIR)/%.o,$(filter %.S,$(ASM_SOURCES)))
OBJECTS = $(C_OBJECTS) $(ASM_OBJECTS)

# Use C fallback for IR timing (ir_asm_c.c); interrupt_handlers.S provides ISR only
USE_ASM = 0
CFLAGS += -DIR_USE_C_FALLBACK

# Target executable
TARGET = $(BIN_DIR)/remote_control

# Default target
all: $(TARGET)

# Create directories if they don't exist
$(OBJ_DIR):
	@mkdir -p $(OBJ_DIR)

$(BIN_DIR):
	@mkdir -p $(BIN_DIR)

# Build target
$(TARGET): $(OBJ_DIR) $(BIN_DIR) $(OBJECTS)
	$(CC) $(OBJECTS) -o $(TARGET) $(LDFLAGS)
	@echo "Build complete: $(TARGET)"
ifdef SIMULATOR
	@echo "Simulator support: ENABLED"
	@echo "Start the simulator with: python test_simulator/main.py"
else
	@echo "Simulator support: DISABLED (use SIMULATOR=1 to enable)"
endif

# Compile C source files
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c
	$(CC) $(CFLAGS) $(INCLUDES) -c $< -o $@

# Compile assembly source files (.s)
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.s
	$(AS) $(ASFLAGS) -c $< -o $@

# Compile assembly source files (.S - preprocessed)
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.S
	$(CC) $(ASFLAGS) $(INCLUDES) -c $< -o $@

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf $(OBJ_DIR) $(BIN_DIR)
	@echo "Clean complete"

# Rebuild from scratch
rebuild: clean all

# Run the program
run: $(TARGET)
	./$(TARGET)

# Windows-specific targets (for MinGW/MSYS2)
ifeq ($(OS),Windows_NT)
run: $(TARGET)
	$(TARGET)
endif

# Examples directory
EXAMPLES_DIR = examples
EXAMPLES = $(wildcard $(EXAMPLES_DIR)/*.c)
EXAMPLE_TARGETS = $(EXAMPLES:$(EXAMPLES_DIR)/%.c=$(BIN_DIR)/%)

# Build examples
examples: $(BIN_DIR) $(EXAMPLE_TARGETS)
	@echo "Examples built successfully"

# Build latency probe specifically
latency-probe: $(BIN_DIR)
	@echo "Building latency probe..."
	$(CC) $(CFLAGS) $(INCLUDES) $(EXAMPLES_DIR)/latency_probe.c \
		$(OBJ_DIR)/latency.o $(OBJ_DIR)/handlers.o $(OBJ_DIR)/ir_codes.o \
		$(OBJ_DIR)/ir_protocol.o $(OBJ_DIR)/universal_tv.o $(OBJ_DIR)/remote_control.o \
		-o $(BIN_DIR)/latency_probe $(LDFLAGS)
	@echo "Latency probe built: $(BIN_DIR)/latency_probe"

# Run latency probe
test-latency: latency-probe
	@echo "Running latency probe..."
	./$(BIN_DIR)/latency_probe

# Windows-specific latency probe run
ifeq ($(OS),Windows_NT)
test-latency: latency-probe
	@echo "Running latency probe..."
	$(BIN_DIR)\\latency_probe.exe
endif

# Build individual example
$(BIN_DIR)/%: $(EXAMPLES_DIR)/%.c $(OBJ_DIR) $(OBJECTS)
	@echo "Building example: $@"
	$(CC) $(CFLAGS) $(INCLUDES) $< \
		$(filter-out $(OBJ_DIR)/main.o,$(OBJECTS)) \
		-o $@ $(LDFLAGS)

# Help target
help:
	@echo "Available targets:"
	@echo "  all           - Build the project (default)"
	@echo "  clean         - Remove build artifacts"
	@echo "  rebuild       - Clean and rebuild"
	@echo "  run           - Build and run the program"
	@echo "  examples      - Build all examples"
	@echo "  latency-probe - Build latency measurement probe"
	@echo "  test-latency  - Build and run latency probe"
	@echo "  help          - Show this help message"
	@echo ""
	@echo "Optional flags:"
	@echo "  SIMULATOR=1   - Enable virtual TV simulator support"
	@echo "                  Example: make SIMULATOR=1"
	@echo ""
	@echo "To use the simulator:"
	@echo "  1. Start simulator: python test_simulator/main.py"
	@echo "  2. Build with simulator: make SIMULATOR=1"
	@echo "  3. Run: ./bin/remote_control (or bin\\remote_control.exe on Windows)"
	@echo ""
	@echo "To test latency:"
	@echo "  make test-latency"

.PHONY: all clean rebuild run help examples latency-probe test-latency

