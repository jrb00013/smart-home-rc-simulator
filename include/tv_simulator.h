#ifndef TV_SIMULATOR_H
#define TV_SIMULATOR_H

/**
 * @file tv_simulator.h
 * @brief Virtual TV Simulator IPC interface
 * 
 * Optional interface for sending remote commands to a virtual TV simulator
 * for testing purposes. Only compiled when SIMULATOR is defined.
 */

#ifdef SIMULATOR

/**
 * @brief Initialize connection to TV simulator
 * @return 0 on success, -1 on failure
 */
int tv_simulator_init(void);

/**
 * @brief Send button code to TV simulator
 * @param button_code Button code to send
 * @return 0 on success, -1 on failure
 */
int tv_simulator_send_button(unsigned char button_code);

/**
 * @brief Close connection to TV simulator
 */
void tv_simulator_cleanup(void);

#else

/* Stub functions when simulator is not enabled */
#define tv_simulator_init() (0)
#define tv_simulator_send_button(x) (0)
#define tv_simulator_cleanup() ((void)0)

#endif /* SIMULATOR */

#endif /* TV_SIMULATOR_H */


