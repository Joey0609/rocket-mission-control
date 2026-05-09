%% TIANZHOU.csv — real_time 线性插值、高度平滑及曲线绘制
%  功能：
%     1. 读取 TIANZHOU.csv
%     2. 对 real_time 列空缺行进行线性插值补齐
%     3. 在 real_time 150~200 s 区间，用平滑曲线覆盖高度 ALTITUDE_ASL（消除波动）
%     4. 保存两个版本：
%        TIANZHOU_filled.csv   — 仅补齐 real_time
%        TIANZHOU_modified.csv — 补齐 real_time + 高度平滑
%     5. 绘制对比曲线

clear; close all; clc;

%% 1. 读取 CSV
filename = 'TIANZHOU.csv';
opts = detectImportOptions(filename);
data = readtable(filename, opts);

% 提取关键列
real_time_raw = data.real_time;        % 原始 real_time（NaN 表示空缺）
acceleration  = data.ACCELERATION;
velocity      = data.SPEED_SURFACE;    % 轨道速度（m/s）
altitude      = data.ALTITUDE_ASL;     % 海拔高度（m）

N = height(data);
fprintf('共 %d 行数据\n', N);

%% 2. 线性插值补齐 real_time
known_idx = find(~isnan(real_time_raw));
known_val = real_time_raw(known_idx);

fprintf('有实际 real_time 的行数: %d\n', length(known_idx));
fprintf('已知 real_time 值: ');
fprintf('%.1f  ', known_val);
fprintf('\n');

all_idx = (1:N)';
real_time_filled = interp1(known_idx, known_val, all_idx, 'linear', 'extrap');

%% ============ 版本 A：仅补齐 real_time ============
data_filled = data;
data_filled.real_time = real_time_filled;

writetable(data_filled, 'TIANZHOU_filled.csv');
fprintf('\n已保存 TIANZHOU_filled.csv（仅补齐 real_time）\n');

%% ============ 版本 B：补齐 real_time + 高度平滑 ============
data_modified = data_filled;                     % 复制补齐后的数据
alt_modified  = data_modified.ALTITUDE_ASL;      % 待修改的高度

% 找到 real_time 150~200 s 对应的行区间
smooth_start = 110;   % 平滑区间起点 (s)
smooth_end   = 250;   % 平滑区间终点 (s)

idx_start = find(real_time_filled >= smooth_start, 1, 'first');
idx_end   = find(real_time_filled <= smooth_end,   1, 'last');

fprintf('\n高度平滑区间: %.0f ~ %.0f s\n', smooth_start, smooth_end);
fprintf('对应数据行: %d ~ %d\n', idx_start, idx_end);

% 提取区间内的高度数据，用贝塞尔曲线拟合平滑
idx_span  = idx_start:idx_end;
n_pre     = 15;  % 区间前用于估计斜率的点数
n_post    = 15;  % 区间后用于估计斜率的点数

x_local = real_time_filled(idx_span);          % 区间内的 real_time
y_local = alt_modified(idx_span);              % 区间内的原始高度

% ---- 估计区间入口斜率（取区间前 n_pre 个点拟合直线）----
idx_pre  = max(1, idx_start - n_pre) : idx_start;
x_pre    = real_time_filled(idx_pre);
y_pre    = alt_modified(idx_pre);
p_pre    = polyfit(x_pre, y_pre, 1);   % 一次多项式（直线）
slope_in = p_pre(1);                   % 入口斜率 dy/dt

% ---- 估计区间出口斜率（取区间后 n_post 个点拟合直线）----
idx_post  = idx_end : min(N, idx_end + n_post);
x_post    = real_time_filled(idx_post);
y_post    = alt_modified(idx_post);
p_post    = polyfit(x_post, y_post, 1);
slope_out = p_post(1);                 % 出口斜率 dy/dt

fprintf('入口斜率: %.4f, 出口斜率: %.4f\n', slope_in, slope_out);

% ---- 带边界斜率约束的贝塞尔曲线拟合 ----
% 归一化 t ∈ [0, 1]
interval_width = x_local(end) - x_local(1);   % 区间实际宽度（秒）
t_local = (x_local - x_local(1)) / interval_width;

% 将真实斜率转换为归一化 t 域的斜率
slope_norm_in  = slope_in  * interval_width;
slope_norm_out = slope_out * interval_width;

degree = 6;
y_smooth = bezier_fit_constrained(t_local, y_local, degree, ...
                                 slope_norm_in, slope_norm_out);

% 用平滑后的值覆盖
alt_modified(idx_span) = y_smooth;

% 写回表格
data_modified.ALTITUDE_ASL = alt_modified;

writetable(data_modified, 'TIANZHOU_modified.csv');
fprintf('已保存 TIANZHOU_modified.csv（补齐 real_time + 高度平滑）\n');

%% 3. 绘制对比曲线
figure('Position', [100, 100, 1400, 900]);

% --- 子图 1：加速度（原始数据，无修改）---
subplot(3, 1, 1);
plot(real_time_filled, acceleration, 'b-', 'LineWidth', 1.2);
xlabel('Real Time (s)');
ylabel('Acceleration (m/s²)');
title('加速度 vs 真实时间');
grid on;
xlim([min(real_time_filled), max(real_time_filled)]);

% --- 子图 2：速度 ---
subplot(3, 1, 2);
plot(real_time_filled, velocity, 'r-', 'LineWidth', 1.2);
xlabel('Real Time (s)');
ylabel('Orbital Velocity (m/s)');
title('轨道速度 vs 真实时间');
grid on;
xlim([min(real_time_filled), max(real_time_filled)]);

% --- 子图 3：高度（含平滑对比）---
subplot(3, 1, 3);
plot(real_time_filled, altitude,    'g-',  'LineWidth', 1.0); hold on;
plot(real_time_filled, alt_modified, 'm--', 'LineWidth', 1.5);
% 标记平滑区间边界
xline(smooth_start, 'k:', 'LineWidth', 1.0);
xline(smooth_end,   'k:', 'LineWidth', 1.0);
hold off;
xlabel('Real Time (s)');
ylabel('Altitude ASL (m)');
title('海拔高度 vs 真实时间（绿色: 原始, 品红虚线: 平滑后）');
legend({'原始', '平滑后', '平滑区间'}, 'Location', 'best');
grid on;
xlim([min(real_time_filled), max(real_time_filled)]);

sgtitle('TIANZHOU 任务 — 关键参数随时间变化', 'FontSize', 14, 'FontWeight', 'bold');

%% 4. 局部放大：150~200 s 高度细节
figure('Position', [200, 200, 900, 500]);
plot(real_time_filled, altitude,    'g-', 'LineWidth', 1.0); hold on;
plot(real_time_filled, alt_modified, 'm-', 'LineWidth', 1.8);
xline(smooth_start, 'k:', 'LineWidth', 1.0);
xline(smooth_end,   'k:', 'LineWidth', 1.0);
hold off;
xlabel('Real Time (s)');
ylabel('Altitude ASL (m)');
title('高度局部对比（150~200 s 区间贝塞尔曲线平滑效果）');
legend({'原始', '平滑后', '平滑区间'}, 'Location', 'best');
grid on;
xlim([smooth_start - 10, smooth_end + 10]);

%% 5. 输出结果摘要
fprintf('\n===== 处理结果摘要 =====\n');
fprintf('real_time 范围: %.2f ~ %.2f s\n', min(real_time_filled), max(real_time_filled));
fprintf('加速度范围:     %.4f ~ %.4f m/s²\n', min(acceleration), max(acceleration));
fprintf('轨道速度范围:   %.2f ~ %.2f m/s\n', min(velocity), max(velocity));
fprintf('高度范围（原始）:  %.2f ~ %.2f m\n', min(altitude), max(altitude));
fprintf('高度范围（平滑后）: %.2f ~ %.2f m\n', min(alt_modified), max(alt_modified));

%% 6. 带边界斜率的贝塞尔曲线拟合函数
function y_fit = bezier_fit_constrained(t, y, degree, slope_in, slope_out)
% BEZIER_FIT_CONSTRAINED   带端点斜率约束的贝塞尔最小二乘拟合
%   t         — 归一化参数 [0, 1]，列向量
%   y         — 待平滑的数据，列向量
%   degree    — 贝塞尔曲线次数
%   slope_in  — t=0 处的斜率 dy/dt_norm
%   slope_out — t=1 处的斜率 dy/dt_norm
%   返回 y_fit — 贝塞尔曲线在 t 处的值
%
%   约束条件：
%     B(0) = P_0          = y(1)           (端点固定)
%     B(1) = P_n          = y(end)         (端点固定)
%     B'(0) = n*(P_1 - P_0)   = slope_in   (入口斜率)
%     B'(1) = n*(P_n - P_{n-1}) = slope_out (出口斜率)
%     → 固定 P_0, P_1, P_{n-1}, P_n，仅优化中间控制点

n = degree;
t = t(:);
y = y(:);
Nt = length(t);

% ---- 确定固定控制点 ----
P_fixed = zeros(n + 1, 1);
P_fixed(1)       = y(1);                    % P_0
P_fixed(2)       = y(1) + slope_in / n;     % P_1
P_fixed(end)     = y(end);                  % P_n
P_fixed(end-1)   = y(end) - slope_out / n;   % P_{n-1}

% 固定控制点的索引（0-based: 0, 1, n-1, n）
% MATLAB 1-based: 1, 2, n, n+1
fixed_idx = [1, 2, n, n + 1];
free_idx  = setdiff(1:n+1, fixed_idx);

% ---- 构建约束 Bernstein 基矩阵 ----
% Bmat_all  = [B_free | B_fixed]
% B_free * P_free = y - B_fixed * P_fixed

Bmat_all = zeros(Nt, n + 1);
for i = 0:n
    Bmat_all(:, i + 1) = nchoosek(n, i) * (1 - t).^(n - i) .* t.^i;
end

B_free  = Bmat_all(:, free_idx);
B_fixed = Bmat_all(:, fixed_idx);

% 目标：B_free * P_free = y - B_fixed * P_fixed(fixed_idx)
rhs = y - B_fixed * P_fixed(fixed_idx);

% 最小二乘求解自由控制点
P_free = (B_free' * B_free) \ (B_free' * rhs);

% ---- 组装全部控制点并计算曲线 ----
P_all = zeros(n + 1, 1);
P_all(fixed_idx) = P_fixed(fixed_idx);
P_all(free_idx)  = P_free;

y_fit = Bmat_all * P_all;
end
