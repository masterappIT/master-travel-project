import { ref } from 'vue'

export function createAdminFormState() {
  const addressForm = ref({ id: '', region: '香港', city: '', name: '', address: '', latitude: null, longitude: null, enabled: true, order: 1 })
  const userForm = ref(null)
  const walletAdjustment = ref(null)
  const tripForm = ref(null)
  const selectedTrip = ref(null)
  const tripDetailLoading = ref(false)
  const tripDetailError = ref('')
  const tripDetailId = ref('')
  const dispatchForm = ref(null)
  const orderUrlForm = ref(null)
  const charterForm = ref(null)
  const administratorForm = ref(null)
  const notificationForm = ref(null)
  const notificationTemplateForm = ref(null)
  const mainlandCityForm = ref(null)
  const membershipForm = ref(null)
  const categoryForm = ref(null)
  const vehicleForm = ref(null)
  const extraForm = ref(null)
  const personnelForm = ref(null)
  const driverForm = ref(null)
  const settlementForm = ref(null)
  const entryForm = ref(null)
  const expenseForm = ref(null)

  return {
    addressForm,
    userForm,
    walletAdjustment,
    tripForm,
    selectedTrip,
    tripDetailLoading,
    tripDetailError,
    tripDetailId,
    dispatchForm,
    orderUrlForm,
    charterForm,
    administratorForm,
    notificationForm,
    notificationTemplateForm,
    mainlandCityForm,
    membershipForm,
    categoryForm,
    vehicleForm,
    extraForm,
    personnelForm,
    driverForm,
    settlementForm,
    entryForm,
    expenseForm
  }
}
