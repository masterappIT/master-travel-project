import { computed, inject, ref } from 'vue'

export const DriverVehiclesPage = {
  name: 'DriverVehiclesPage',
  setup() {
    const context = inject('adminDriverVehiclesContext')
    const selectedDriverId = ref('')
    const search = ref('')
    const statusFilter = ref('all')
    const filteredVehicles = computed(() => {
      const keyword = search.value.trim().toLowerCase()
      return context.vehicles.value.filter(vehicle => {
        const matchesStatus = statusFilter.value === 'all'
          || (statusFilter.value === 'enabled' && vehicle.enabled !== false)
          || (statusFilter.value === 'disabled' && vehicle.enabled === false)
        const haystack = [vehicle.hkPlate, vehicle.macauPlate, vehicle.mainlandPlate, vehicle.vehicleOwnership, vehicle.vehicleCategory, vehicle.vehicleColor, vehicle.driverName].join(' ').toLowerCase()
        return matchesStatus && (!keyword || haystack.includes(keyword))
      })
    })
    const enabledCount = computed(() => context.vehicles.value.filter(vehicle => vehicle.enabled !== false).length)
    const assignedCount = computed(() => context.vehicles.value.filter(vehicle => vehicle.assignments?.length).length)
    const displayPlate = vehicle => vehicle.hkPlate || vehicle.macauPlate || vehicle.mainlandPlate || '未設定車牌'
    const plateSummary = vehicle => [vehicle.hkPlate, vehicle.macauPlate, vehicle.mainlandPlate].filter(Boolean)
    return { ...context, selectedDriverId, search, statusFilter, filteredVehicles, enabledCount, assignedCount, displayPlate, plateSummary }
  },
  template: String.raw`
    <section v-if="view==='driver-vehicles'" class="vehicle-registry">
      <div class="vehicle-page-heading">
        <div><span class="eyebrow">VEHICLE MANAGEMENT</span><h2>車輛管理</h2><p>集中管理登記車輛、使用狀態及司機綁定。</p></div>
        <button type="button" v-if="canWrite" class="vehicle-primary-action" @click="openFirstVehicleForm"><span aria-hidden="true">＋</span>新增車輛</button>
      </div>
      <div class="vehicle-summary-grid" aria-label="車輛統計">
        <article><span>登記車輛</span><strong>{{vehicles.length}}</strong></article>
        <article><span>啟用中</span><strong>{{enabledCount}}</strong></article>
        <article><span>已綁定司機</span><strong>{{assignedCount}}</strong></article>
      </div>
      <section class="vehicle-list-panel">
        <div class="vehicle-list-toolbar">
          <label class="vehicle-search-field"><span>搜尋車輛</span><input v-model="search" type="search" placeholder="車牌、類別、顏色或司機" /></label>
          <label class="vehicle-filter-field"><span>使用狀態</span><select v-model="statusFilter"><option value="all">全部狀態</option><option value="enabled">啟用中</option><option value="disabled">已停用</option></select></label>
          <span class="vehicle-result-count"><strong>{{filteredVehicles.length}}</strong> 部車輛</span>
          <button type="button" class="vehicle-refresh-action" @click="refresh" title="重新整理車輛資料" aria-label="重新整理車輛資料">↻</button>
        </div>
        <div class="vehicle-table-wrap"><table><thead><tr><th>相片</th><th>車輛</th><th>車輛資料</th><th>綁定司機</th><th>狀態</th><th>操作</th></tr></thead><tbody>
          <tr v-for="vehicle in filteredVehicles" :key="vehicle.id">
            <td class="vehicle-photo-cell"><VehiclePhotoViewer v-if="vehicle.vehiclePhotoUrl" :src="vehicle.vehiclePhotoUrl" :alt="displayPlate(vehicle) + ' 車輛相片'"/><span v-else>未上傳</span></td>
            <td><div class="vehicle-plate-cell"><strong>{{displayPlate(vehicle)}}</strong><div v-if="plateSummary(vehicle).length > 1" class="vehicle-alt-plates"><span v-for="plate in plateSummary(vehicle).slice(1)" :key="plate">{{plate}}</span></div><small>{{vehicle.vehicleOwnership || '未設定歸屬地'}} · {{vehicle.plateType || '單牌'}}</small></div></td>
            <td><div class="vehicle-spec-cell"><strong>{{vehicle.vehicleCategory || '未設定類別'}}</strong><span>{{vehicle.vehicleColor || '未設定顏色'}}</span></div></td>
            <td><button type="button" class="vehicle-assignment-link" @click="manageVehicleAssignments(vehicle)"><span>{{vehicle.assignments?.length || 0}}</span><span>{{vehicle.driverName || '尚未綁定'}}</span></button></td>
            <td><span class="vehicle-status" :class="vehicle.enabled === false ? 'is-disabled' : 'is-enabled'"><i></i>{{vehicle.enabled === false ? '已停用' : '啟用中'}}</span></td>
            <td><div class="vehicle-row-actions"><button type="button" @click="manageVehicleAssignments(vehicle)">綁定</button><button type="button" v-if="canWrite" class="is-primary" @click="editVehicleFromRegistry(vehicle)">編輯</button><details v-if="canWrite" class="vehicle-more-menu"><summary title="更多操作" aria-label="更多操作">•••</summary><div><button type="button" @click="updateVehicleStatus(vehicle)">{{vehicle.enabled === false ? '恢復使用' : '停用車輛'}}</button><button type="button" class="danger" @click="removeVehicle(vehicle)">永久刪除</button></div></details></div></td>
          </tr>
          <tr v-if="!filteredVehicles.length"><td colspan="6" class="vehicle-empty-state"><strong>{{vehicles.length ? '找不到符合條件的車輛' : '尚未建立登記車輛'}}</strong><span>{{vehicles.length ? '請調整搜尋內容或使用狀態。' : '新增第一部車輛後，資料會顯示在這裡。'}}</span></td></tr>
        </tbody></table></div>
      </section>
      <div v-if="assignmentVehicle" class="modal-backdrop" @click.self="closeVehicleAssignments"><section class="vehicle-assignment-modal" role="dialog" aria-modal="true" aria-labelledby="vehicle-assignment-title">
        <header class="vehicle-modal-heading"><div><span class="eyebrow">DRIVER ASSIGNMENTS</span><h2 id="vehicle-assignment-title">綁定司機</h2><p>{{displayPlate(assignmentVehicle)}} · {{assignmentVehicle.vehicleCategory || '未設定類別'}}</p></div><button type="button" class="vehicle-icon-button" @click="closeVehicleAssignments" aria-label="關閉">×</button></header>
        <div class="vehicle-assignment-body"><div class="vehicle-assignment-list"><div v-for="assignment in vehicleAssignments" :key="assignment.id" class="vehicle-assignment-row"><div class="vehicle-driver-avatar">{{assignment.driver.name?.slice(0,1) || '司'}}</div><div><strong>{{assignment.driver.name}}</strong><span>{{assignment.driver.phone || '未提供電話'}}{{assignment.driver.enabled === false ? ' · 帳號已停用' : ''}}</span><span v-if="assignment.isPrimary" class="vehicle-primary-badge">主要車輛</span></div><div v-if="canWrite" class="vehicle-assignment-actions"><button type="button" v-if="!assignment.isPrimary && assignment.driver.enabled !== false && assignmentVehicle.enabled !== false" class="vehicle-set-primary-action" @click="setPrimaryVehicle(assignment.driver.id)">設為主要</button><button type="button" class="vehicle-unbind-action" @click="unbindVehicleDriver(assignment.driver.id)">解除</button></div></div><div v-if="!vehicleAssignments.length" class="vehicle-inline-empty">目前沒有綁定司機</div></div>
          <div v-if="canWrite" class="vehicle-assignment-add"><label><span>新增司機</span><select v-model="selectedDriverId"><option value="">請選擇司機</option><option v-for="driver in availableDrivers" :key="driver.id" :value="driver.id" :disabled="vehicleAssignments.some(item => item.driver.id === driver.id)">{{driver.name}} · {{driver.phone || '未提供電話'}}</option></select></label><button type="button" class="vehicle-primary-action" :disabled="!selectedDriverId" @click="bindVehicleDriver(selectedDriverId); selectedDriverId=''">新增綁定</button></div>
        </div></section></div>
      <div v-if="vehicleForm" class="vehicle-form-backdrop" @click.self="closeVehicleForm"></div>
      <form v-if="vehicleForm" class="vehicle-form-drawer" @submit.prevent="saveVehicle" aria-labelledby="vehicle-form-title">
        <header class="vehicle-form-heading"><div><span class="eyebrow">{{vehicleForm.id ? 'EDIT VEHICLE' : 'NEW VEHICLE'}}</span><h2 id="vehicle-form-title">{{vehicleForm.id ? '編輯車輛' : '新增車輛'}}</h2><p>{{vehicleForm.id ? '更新車輛的登記與車牌資料。' : '建立車輛後可繼續管理多名司機綁定。'}}</p></div><button type="button" class="vehicle-icon-button" @click="closeVehicleForm" aria-label="關閉">×</button></header>
        <div class="vehicle-form-body">
          <section class="vehicle-form-section"><div class="vehicle-section-heading"><span>1</span><div><h3>基本資料</h3><p>設定車輛歸屬、類別及外觀。</p></div></div><div class="vehicle-form-grid">
            <label><span>車輛歸屬地</span><select v-model="vehicleForm.vehicleOwnership" @change="changeVehicleOwnership"><option>香港</option><option>澳門</option><option>中國內地</option></select></label>
            <label><span>車牌類型</span><select v-model="vehicleForm.plateType" :disabled="vehicleForm.vehicleOwnership==='中國內地'"><option v-if="vehicleForm.vehicleOwnership!=='中國內地'">單牌</option><option>兩地牌</option><option v-if="vehicleForm.vehicleOwnership!=='中國內地'">三地牌</option></select><small v-if="vehicleForm.vehicleOwnership==='中國內地'">內地車輛固定使用兩地牌</small></label>
            <label><span>車輛類別</span><input v-model="vehicleForm.vehicleCategory" list="vehicle-category-options" placeholder="選擇或輸入車輛類別" required/><datalist id="vehicle-category-options"><option v-for="category in vehicleCategories" :key="category.id || category.name" :value="category.name || category.label || category" /></datalist></label>
            <label><span>車輛顏色</span><input v-model="vehicleForm.vehicleColor" placeholder="例如：黑色" required/></label>
          </div></section>
          <section class="vehicle-form-section"><div class="vehicle-section-heading"><span>2</span><div><h3>車牌資料</h3><p>只顯示目前歸屬地與車牌類型需要的欄位。</p></div></div><div class="vehicle-form-grid">
            <label v-if="vehicleForm.vehicleOwnership==='香港' || vehicleForm.vehicleOwnership==='中國內地' || vehicleForm.plateType==='三地牌'"><span>香港車牌</span><input v-model="vehicleForm.hkPlate" autocomplete="off" placeholder="AB 1234"/><small>英文字母、數字及空格，最多 8 個字元</small></label>
            <label v-if="vehicleForm.vehicleOwnership==='澳門' || vehicleForm.plateType==='三地牌'"><span>{{vehicleForm.vehicleOwnership==='香港' && vehicleForm.plateType==='三地牌' ? '澳門車牌（選填）' : '澳門車牌'}}</span><input v-model="vehicleForm.macauPlate" autocomplete="off" placeholder="AA-00-00"/><small>儲存時會自動整理為 AA-00-00</small></label>
            <label v-if="vehicleForm.vehicleOwnership==='中國內地' || vehicleForm.plateType==='兩地牌' || vehicleForm.plateType==='三地牌'" class="vehicle-mainland-field"><span>內地／跨境車牌</span><div class="vehicle-composed-plate"><span v-if="vehicleForm.vehicleOwnership==='香港'">粵Z·</span><span v-else-if="vehicleForm.vehicleOwnership==='澳門'">粵Z·</span><span v-else>粵</span><input v-model="vehicleForm.mainlandPlate" autocomplete="off" :placeholder="vehicleForm.vehicleOwnership==='中國內地' ? 'A·12345' : '1234'"/><span v-if="vehicleForm.vehicleOwnership==='香港'">港</span><span v-else-if="vehicleForm.vehicleOwnership==='澳門'">澳</span></div><small>固定地區字首與尾碼由系統自動加入</small></label>
          </div></section>
          <section class="vehicle-form-section"><div class="vehicle-section-heading"><span>3</span><div><h3>司機與相片</h3><p>建立時可先綁定一名司機，也可稍後管理多人綁定。</p></div></div><div class="vehicle-form-grid">
            <label><span>初始綁定司機 <em>選填</em></span><select v-model="vehicleForm.driverId"><option value="">暫不綁定</option><option v-for="driver in availableDrivers" :key="driver.id" :value="driver.id">{{driver.name}} · {{driver.phone || '未提供電話'}}</option></select></label>
            <label><span>車輛相片 <em>選填</em></span><input type="file" accept="image/jpeg,image/png,image/webp" @change="uploadVehiclePhoto"/><small>支援 JPEG、PNG、WebP，檔案不可超過 2 MB</small></label>
            <div class="vehicle-form-photo-preview"><VehiclePhotoViewer v-if="vehicleForm.vehiclePhotoUrl" :src="vehicleForm.vehiclePhotoUrl" :alt="displayPlate(vehicleForm) + ' 車輛相片'"/><span v-else>尚未上傳相片</span></div>
          </div></section>
        </div>
        <footer class="vehicle-form-actions"><button type="button" class="secondary" @click="closeVehicleForm">取消</button><button type="submit" class="vehicle-primary-action">{{vehicleForm.id ? '儲存修改' : '建立車輛'}}</button></footer>
      </form>
    </section>`
}
