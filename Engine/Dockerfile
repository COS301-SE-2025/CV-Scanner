FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt update && apt install -y \
    build-essential \
    git \
    curl \
    unzip \
    pkg-config \
    libssl-dev \
    libcurl4-openssl-dev \
    ca-certificates \
    && apt clean \
    && rm -rf /var/lib/apt/lists/*

# Install CMake 3.27.9 from official release
RUN mkdir -p /tmp/cmake && cd /tmp/cmake && \
    curl -LO https://github.com/Kitware/CMake/releases/download/v3.27.9/cmake-3.27.9-linux-x86_64.tar.gz && \
    tar -xzf cmake-3.27.9-linux-x86_64.tar.gz && \
    cp -r cmake-3.27.9-linux-x86_64/bin/* /usr/local/bin/ && \
    cp -r cmake-3.27.9-linux-x86_64/share/* /usr/local/share/ && \
    rm -rf /tmp/cmake

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Navigate to the engine subdirectory where CMakeLists.txt is located
WORKDIR /app/engine

# Build the C++ Engine
RUN mkdir -p build && cd build && cmake .. && make

# Expose the port your engine uses
EXPOSE 8080

# Set the default command
CMD ["./build/Engine"]