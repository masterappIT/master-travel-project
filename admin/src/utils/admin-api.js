import { createApiClient } from '../api/client'
import { createUsersApi } from '../api/users.js'
import { createDriversApi } from '../api/drivers.js'
import { createTripsApi } from '../api/trips.js'
import { createAddressesApi } from '../api/addresses.js'

export function createAdminApi({ baseUrl, token }) {
  const api = createApiClient({
    baseUrl,
    getToken: () => token.value,
    onUnauthorized: () => {
      token.value = ''
      localStorage.removeItem('admin_token')
    }
  })

  return {
    api,
    usersApi: createUsersApi(api),
    driversApi: createDriversApi(api),
    tripsApi: createTripsApi(api),
    addressesApi: createAddressesApi(api)
  }
}
