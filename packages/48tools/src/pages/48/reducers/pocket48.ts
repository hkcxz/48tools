import { createSlice, Slice, SliceCaseReducers, PayloadAction, CaseReducerActions } from '@reduxjs/toolkit';
import { findIndex } from 'lodash';
import type { WebWorkerChildItem } from '../../../types';
import type { LiveInfo } from '../services/interface';

export interface Pocket48InitialState {
  liveList: Array<LiveInfo>;
  liveChildList: Array<WebWorkerChildItem>;
  recordList: Array<LiveInfo>;
  recordNext: string;
  recordChildList: Array<WebWorkerChildItem>;
}

type CaseReducers = SliceCaseReducers<Pocket48InitialState>;

const { actions, reducer }: Slice = createSlice<Pocket48InitialState, CaseReducers>({
  name: 'pocket48',
  initialState: {
    liveList: [],       // 直播信息
    liveChildList: [],  // 直播下载
    recordList: [],     // 录播信息
    recordNext: '0',    // 记录录播分页位置
    recordChildList: [] // 录播下载
  },
  reducers: {
    // 直播信息
    setLiveList(state: Pocket48InitialState, action: PayloadAction<Array<LiveInfo>>): Pocket48InitialState {
      state.liveList = action.payload;

      return state;
    },

    // 添加直播下载
    setAddLiveChildList(state: Pocket48InitialState, action: PayloadAction<WebWorkerChildItem>): Pocket48InitialState {
      state.liveChildList = state.liveChildList.concat([action.payload]);

      return state;
    },

    // 删除直播下载
    setDeleteLiveChildList(state: Pocket48InitialState, action: PayloadAction<LiveInfo>): Pocket48InitialState {
      const index: number = findIndex(state.liveChildList, { id: action.payload.liveId });

      if (index >= 0) {
        state.liveChildList.splice(index, 1);
        state.liveChildList = [...state.liveChildList];
      }

      return state;
    },

    // 录播加载
    setRecordList(state: Pocket48InitialState, action: PayloadAction<{ next: string; data: Array<LiveInfo> }>): Pocket48InitialState {
      state.recordList = action.payload.data;
      state.recordNext = action.payload.next;

      return state;
    },

    // 添加录播下载
    setAddRecordChildList(state: Pocket48InitialState, action: PayloadAction<WebWorkerChildItem>): Pocket48InitialState {
      state.recordChildList = state.recordChildList.concat([action.payload]);

      return state;
    },

    // 删除录播下载
    setDeleteRecordChildList(state: Pocket48InitialState, action: PayloadAction<LiveInfo>): Pocket48InitialState {
      const index: number = findIndex(state.recordChildList, { id: action.payload.liveId });

      if (index >= 0) {
        state.recordChildList.splice(index, 1);
        state.recordChildList = [...state.recordChildList];
      }

      return state;
    }
  }
});

export const {
  setLiveList,
  setAddLiveChildList,
  setDeleteLiveChildList,
  setRecordList,
  setAddRecordChildList,
  setDeleteRecordChildList
}: CaseReducerActions<CaseReducers> = actions;
export default { pocket48: reducer };