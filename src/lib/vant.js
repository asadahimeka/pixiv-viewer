import Vue from 'vue'
import Button from 'vant/lib/button'
import Search from 'vant/lib/search'
import Tabs from 'vant/lib/tabs'
import Tab from 'vant/lib/tab'
import List from 'vant/lib/list'
import NavBar from 'vant/lib/nav-bar'
import ActionSheet from 'vant/lib/action-sheet'
import Popup from 'vant/lib/popup'
import Dialog from 'vant/lib/dialog'
import Cell from 'vant/lib/cell'
import CellGroup from 'vant/lib/cell-group'
import Calendar from 'vant/lib/calendar'
import Collapse from 'vant/lib/collapse'
import CollapseItem from 'vant/lib/collapse-item'
import ShareSheet from 'vant/lib/share-sheet'
import Tag from 'vant/lib/tag'
import Icon from 'vant/lib/icon'
import Slider from 'vant/lib/slider'
import DropdownMenu from 'vant/lib/dropdown-menu'
import DropdownItem from 'vant/lib/dropdown-item'
import Switch from 'vant/lib/switch'
import Radio from 'vant/lib/radio'
import Field from 'vant/lib/field'
import Popover from 'vant/lib/popover'
import Loading from 'vant/lib/loading'
import Form from 'vant/lib/form'
import SwipeCell from 'vant/lib/swipe-cell'
import Skeleton from 'vant/lib/skeleton'
import Sticky from 'vant/lib/sticky'
import Divider from 'vant/lib/divider'
import RadioGroup from 'vant/lib/radio-group'
import Empty from 'vant/lib/empty'
import Uploader from 'vant/lib/uploader'
import Checkbox from 'vant/lib/checkbox'
import NoticeBar from 'vant/lib/notice-bar'

export default function setupVant() {
  Vue.use(Button)
  Vue.use(Search)
  Vue.use(Tabs)
  Vue.use(Tab)
  Vue.use(List)
  Vue.use(NavBar)
  Vue.use(ActionSheet)
  Vue.use(Popup)
  Vue.use(Dialog)
  Vue.use(Cell)
  Vue.use(CellGroup)
  Vue.use(Calendar)
  Vue.use(Collapse)
  Vue.use(CollapseItem)
  Vue.use(ShareSheet)
  Vue.use(Tag)
  Vue.use(Icon)
  Vue.use(Slider)
  Vue.use(DropdownMenu)
  Vue.use(DropdownItem)
  Vue.use(Switch)
  Vue.use(Radio)
  Vue.use(Field)
  Vue.use(Popover)
  Vue.use(Loading)
  Vue.use(Form)
  Vue.use(SwipeCell)
  Vue.use(Skeleton)
  Vue.use(Sticky)
  Vue.use(Divider)
  Vue.use(RadioGroup)
  Vue.use(Empty)
  Vue.use(Uploader)
  Vue.use(Checkbox)
  Vue.use(NoticeBar)
}
