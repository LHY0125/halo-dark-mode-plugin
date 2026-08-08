package run.halo.darkmode;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import run.halo.app.plugin.BasePlugin;
import run.halo.app.plugin.PluginContext;

/**
 * <p>Plugin main class to manage the lifecycle of the plugin.</p>
 * <p>This class must be public and have a public constructor.</p>
 * <p>Only one main class extending {@link BasePlugin} is allowed per plugin.</p>
 *
 * @author LHY
 * @since 1.0.5
 */
@Slf4j
@Component
public class DarkModePlugin extends BasePlugin {

    public DarkModePlugin(PluginContext pluginContext) {
        super(pluginContext);
    }

    @Override
    public void start() {
        log.info("插件启动成功！");
    }

    @Override
    public void stop() {
        log.info("插件停止！");
    }
}