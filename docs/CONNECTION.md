# Connection Management

This document describes the connection management system for ensuring reliable communication between the remote control and target devices.

## Overview

The connection management system provides:
- **Automatic connection establishment** before sending commands
- **Connection verification** at configurable intervals
- **Automatic retry** with exponential backoff
- **Connection quality monitoring** based on success rates
- **Auto-reconnect** on connection loss
- **Connection statistics** tracking

## Features

### Connection States

- `CONNECTION_DISCONNECTED` - Not connected to any device
- `CONNECTION_CONNECTING` - Currently establishing connection
- `CONNECTION_CONNECTED` - Successfully connected
- `CONNECTION_VERIFYING` - Verifying connection status
- `CONNECTION_FAILED` - Connection attempt failed
- `CONNECTION_TIMEOUT` - Connection timeout

### Connection Quality

Quality is calculated based on transmission success rate:
- **Excellent** (≥95% success rate)
- **Good** (≥80% success rate)
- **Fair** (≥60% success rate)
- **Poor** (<60% success rate)
- **None** (no transmissions)

### Automatic Features

1. **Auto-Connection**: Automatically establishes connection before sending commands
2. **Auto-Verification**: Periodically verifies connection status
3. **Auto-Reconnect**: Automatically reconnects on connection loss
4. **Auto-Retry**: Retries failed transmissions with configurable attempts

## Usage

### Basic Usage

```c
#include "remote_control.h"
#include "connection.h"

int main(void) {
    /* Initialize remote control (includes connection system) */
    remote_init();
    
    /* Connection is automatically ensured when sending commands */
    remote_press_button(BUTTON_POWER);
    
    remote_cleanup();
    return 0;
}
```

### Manual Connection Management

```c
/* Ensure connection before sending */
if (remote_ensure_connection(DEVICE_TV) == 0) {
    printf("Connected to TV\n");
}

/* Check connection status */
if (remote_is_connected()) {
    printf("Currently connected\n");
}

/* Test connection */
if (connection_test(BUTTON_POWER) == 0) {
    printf("Connection test passed\n");
}

/* Verify connection */
if (connection_verify() == 0) {
    printf("Connection verified\n");
}
```

### Configuration

```c
/* Configure connection settings */
connection_config_t config = {
    .max_retries = 3,              /* Max retry attempts */
    .retry_delay_ms = 500,         /* Delay between retries */
    .connection_timeout_ms = 5000, /* Connection timeout */
    .verify_interval_ms = 30000,   /* Verification interval (30s) */
    .auto_reconnect = 1,           /* Enable auto-reconnect */
    .verify_on_send = 0            /* Verify before each send */
};

connection_set_config(&config);
```

### Connection Statistics

```c
/* Get connection statistics */
connection_stats_t* stats = connection_get_stats();

printf("Total transmissions: %u\n", stats->total_transmissions);
printf("Successful: %u\n", stats->successful_transmissions);
printf("Failed: %u\n", stats->failed_transmissions);
printf("Retries: %u\n", stats->retry_count);
printf("Connection attempts: %u\n", stats->connection_attempts);

/* Get connection quality */
connection_quality_t quality = connection_get_quality();
printf("Quality: %d\n", quality);
```

## API Reference

### Connection Establishment

#### `connection_establish(device_type)`
Establishes connection to specified device type.

**Returns:**
- `0` on success
- `-1` on failure

#### `remote_ensure_connection(device_type)`
Ensures connection is established (wrapper function).

**Returns:**
- `0` on success
- `-1` on failure

### Connection Verification

#### `connection_verify()`
Verifies connection status by sending test command.

**Returns:**
- `0` if connected
- `-1` if disconnected

#### `connection_test(test_button)`
Tests connection by sending specified button command.

**Returns:**
- `0` on success
- `-1` on failure

### Connection Status

#### `connection_get_status()`
Returns current connection status.

**Returns:** `connection_status_t` enum value

#### `connection_is_connected()`
Checks if connection is active.

**Returns:**
- `1` if connected
- `0` if disconnected

#### `remote_is_connected()`
Wrapper function to check connection status.

**Returns:**
- `1` if connected
- `0` if disconnected

### Connection Statistics

#### `connection_get_stats()`
Returns pointer to connection statistics structure.

**Returns:** Pointer to `connection_stats_t`

#### `connection_get_quality()`
Returns current connection quality rating.

**Returns:** `connection_quality_t` enum value

#### `connection_reset_stats()`
Resets all connection statistics.

### Connection Management

#### `connection_reconnect()`
Reconnects to previously connected device.

**Returns:**
- `0` on success
- `-1` on failure

#### `connection_disconnect()`
Disconnects from current device.

### Transmission with Retry

#### `connection_send_with_retry(ir_code)`
Sends IR code with automatic retry and connection verification.

**Features:**
- Verifies connection if configured
- Retries on failure (up to max_retries)
- Auto-reconnects on failure if enabled
- Updates connection statistics

**Returns:**
- `0` on success
- `-1` on failure

## Configuration Options

### `max_retries`
Maximum number of retry attempts for failed transmissions.

**Default:** `3`

### `retry_delay_ms`
Delay in milliseconds between retry attempts.

**Default:** `500` (0.5 seconds)

### `connection_timeout_ms`
Timeout for connection establishment in milliseconds.

**Default:** `5000` (5 seconds)

### `verify_interval_ms`
Interval between automatic connection verifications in milliseconds.

**Default:** `30000` (30 seconds)

### `auto_reconnect`
Enable automatic reconnection on connection loss.

**Default:** `1` (enabled)

### `verify_on_send`
Verify connection before each transmission.

**Default:** `0` (disabled, for performance)

## Integration

The connection system is automatically integrated into the remote control:

1. **Initialization**: Connection system initializes with `remote_init()`
2. **Automatic Connection**: `remote_press_button()` automatically ensures connection
3. **Retry Logic**: Failed transmissions are automatically retried
4. **Statistics**: All transmissions are tracked in statistics

## Best Practices

1. **Configure retry settings** based on your environment
2. **Enable auto-reconnect** for unreliable connections
3. **Monitor connection quality** to detect issues
4. **Use connection statistics** for debugging
5. **Verify connection** periodically for critical operations

## Example: Complete Connection Setup

```c
#include "remote_control.h"
#include "connection.h"

int main(void) {
    /* Initialize */
    remote_init();
    
    /* Configure connection */
    connection_config_t config = {
        .max_retries = 5,
        .retry_delay_ms = 1000,
        .auto_reconnect = 1,
        .verify_on_send = 1
    };
    connection_set_config(&config);
    
    /* Ensure connection */
    if (remote_ensure_connection(DEVICE_TV) != 0) {
        fprintf(stderr, "Failed to connect\n");
        return 1;
    }
    
    /* Use remote (connection is maintained automatically) */
    remote_press_button(BUTTON_POWER);
    remote_press_button(BUTTON_VOLUME_UP);
    
    /* Check statistics */
    connection_stats_t* stats = connection_get_stats();
    printf("Success rate: %.1f%%\n",
           (float)stats->successful_transmissions / 
           stats->total_transmissions * 100.0f);
    
    /* Cleanup */
    remote_cleanup();
    return 0;
}
```

## Troubleshooting

### Connection Fails Immediately

- Check IR hardware initialization
- Verify device is in range
- Check IR codes are correct
- Increase `connection_timeout_ms`

### High Failure Rate

- Check connection quality
- Increase `max_retries`
- Enable `verify_on_send`
- Check for interference

### Connection Drops Frequently

- Enable `auto_reconnect`
- Decrease `verify_interval_ms`
- Check hardware connections
- Monitor connection statistics

## See Also

- `examples/connection_example.c` - Complete connection example
- `include/connection.h` - Connection API reference
- `src/connection.c` - Connection implementation


