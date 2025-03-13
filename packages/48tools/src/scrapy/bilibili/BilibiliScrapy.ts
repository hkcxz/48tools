import type { DefaultOptionType } from 'rc-select/es/Select';
import { requestRoomInfoData, requestRoomPlayerUrlV2, type RoomInfo, type RoomPlayUrlV2, type RoomPlayUrlV2QnDesc } from '@48tools-api/bilibili/live';
import { BilibiliVideoType, ErrorLevel } from './enum';
import { BilibiliVideoUrlParser } from './BilibiliVideoUrlParser';
import type { BilibiliVideoResultItem, BilibiliVideoInfoItem } from './interface';

export * from './enum';

interface BilibiliScrapyCoreOptions {
  useProxy?: boolean;
  proxy?: string;
}

interface BilibiliScrapyUrlOptions extends BilibiliScrapyCoreOptions {
  url: string;
}

interface BilibiliScrapyParseOptions extends BilibiliScrapyCoreOptions {
  type: string;
  id: string;
  page?: number;
}

type BilibiliScrapyOptions = BilibiliScrapyUrlOptions | BilibiliScrapyParseOptions;

/* B站爬虫 */
export class BilibiliScrapy {
  public options: BilibiliScrapyOptions;
  public videoUrlParseResult?: BilibiliVideoUrlParser;

  // 解析结果
  title: string; // 视频标题
  cover: string; // 视频主封面
  videoResult: Array<BilibiliVideoResultItem>; // 视频列表
  qnList: Array<DefaultOptionType>; // 分辨率选择
  error?: {
    level: ErrorLevel;
    message: string;
  };

  static isUrlOptions(options: BilibiliScrapyOptions): options is BilibiliScrapyUrlOptions {
    return 'url' in options;
  }

  /** @param options */
  constructor(options: BilibiliScrapyOptions) {
    this.options = options;

    if (BilibiliScrapy.isUrlOptions(options)) {
      this.videoUrlParseResult = new BilibiliVideoUrlParser(options.url);
    }
  }

  // 视频类型
  get type(): BilibiliVideoType | undefined {
    if (BilibiliScrapy.isUrlOptions(this.options)) {
      return this.videoUrlParseResult?.videoType;
    }

    if (this.options.type === 'pugv_ep') {
      return BilibiliVideoType.CHEESE_EP;
    }

    return this.options.type as BilibiliVideoType;
  }

  // 视频id
  get id(): string | undefined {
    if (BilibiliScrapy.isUrlOptions(this.options)) {
      return this.videoUrlParseResult?.videoId;
    }

    return this.options.id;
  }

  // 视频分页
  get page(): number | undefined {
    if (BilibiliScrapy.isUrlOptions(this.options)) {
      return this.videoUrlParseResult?.videoPage;
    }

    return this.options.page;
  }

  // 设置错误信息
  setError(level: ErrorLevel, message: string): void {
    this.error = { level, message };
  }

  // 解析
  async parse(): Promise<void> {
    if (!(this.type && this.id)) return this.setError(ErrorLevel.Error, 'B站视频信息解析错误');

    if (this.type === BilibiliVideoType.LIVE) return await this.parseLive(this.id);
  }

  // 直播
  async parseLive(id: string): Promise<void> {
    const roomInfoRes: RoomInfo = await requestRoomInfoData(id);

    if (roomInfoRes.code !== 0 || !roomInfoRes.data) return this.setError(ErrorLevel.Error, roomInfoRes.message);

    if (roomInfoRes.data.live_status !== 1) return this.setError(ErrorLevel.Warning, '当前直播未开始');

    const roomPlayUrlRes: RoomPlayUrlV2 = await requestRoomPlayerUrlV2(id);

    if (roomPlayUrlRes.code !== 0 || !roomPlayUrlRes.data) return this.setError(ErrorLevel.Error, roomPlayUrlRes.message);

    if (roomPlayUrlRes.data.live_status !== 1) return this.setError(ErrorLevel.Warning, '当前直播未开始');

    this.title = roomInfoRes.data.title;
    this.cover = roomInfoRes.data.user_cover;

    // 视频列表
    const videoInfo: Array<BilibiliVideoInfoItem> = [];
    const useQnArray: Array<number> = [];

    for (const stream of roomPlayUrlRes.data.playurl_info.playurl.stream) {
      for (const format of stream.format) {
        for (const codec of format.codec) {
          for (const urlInfo of codec.url_info) {
            if (!useQnArray.includes(codec.current_qn)) useQnArray.push(codec.current_qn);

            videoInfo.push({
              videoUrl: `${ urlInfo.host }${ codec.base_url }${ urlInfo.extra }`,
              quality: codec.current_qn
            });
          }
        }
      }
    }

    // 画质列表
    this.qnList = roomPlayUrlRes.data.playurl_info.playurl.g_qn_desc.filter((o: RoomPlayUrlV2QnDesc): boolean => useQnArray.includes(o.qn))
      .map((o: RoomPlayUrlV2QnDesc): DefaultOptionType => ({ value: o.qn, label: o.desc }));

    this.videoResult = [{
      title: this.title,
      cover: this.cover,
      avid: '',
      bid: '',
      cid: '',
      videoInfo
    }];
  }
}