import { inject } from 'vue'

export const MembershipPage = {
  name: 'MembershipPage',
  setup() {
    return inject('adminMembershipContext')
  },
  template: String.raw`<section v-if="view==='membership'" class="editor-section"><div class="panel"><div class="admin-toolbar"><h2>會員方案</h2><button type="button" @click="resetMembership">新增方案</button></div><form v-if="membershipForm" class="record-form" @submit.prevent="saveMembership"><input v-model="membershipForm.id" placeholder="方案 ID" required/><input v-model="membershipForm.level" placeholder="等級" required/><input v-model="membershipForm.name" placeholder="方案名稱" required/><input v-model.number="membershipForm.monthly" type="number" min="0" placeholder="月付"/><input v-model.number="membershipForm.yearly" type="number" min="0" placeholder="年付"/><input v-model.number="membershipForm.order" type="number" min="1" placeholder="排序"/><textarea v-model="membershipForm.benefits" placeholder="權益（每行一項）"></textarea><label><input v-model="membershipForm.recommended" type="checkbox"/> 推薦</label><label><input v-model="membershipForm.enabled" type="checkbox"/> 啟用</label><button type="submit">儲存</button><button type="button" class="secondary" @click="membershipForm=null">取消</button></form><table><thead><tr><th>ID</th><th>方案</th><th>月付</th><th>年付</th><th>權益</th><th>操作</th></tr></thead><tbody><tr v-for="item in membershipPlans" :key="item.id"><td>{{item.id}}</td><td><b>{{item.name}}</b><br/><span class="muted">{{item.level}}</span></td><td>HKD {{item.monthly}}</td><td>HKD {{item.yearly}}</td><td>{{formatBenefits(item)}}</td><td class="row-actions"><button type="button" @click="editMembership(item)">編輯</button><button type="button" class="danger" @click="removeMembership(item)">刪除</button></td></tr></tbody></table></div></section>`
}
