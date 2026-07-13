# Add project specific ProGuard rules here.

# Netty (via ktor-server-netty) reflectively probes for several optional server-side
# integrations we never put on the classpath on purpose (native OpenSSL/tcnative,
# BouncyCastle PEM parsing, Conscrypt, Log4j 1/2, old-style Jetty NPN, reactor
# BlockHound). Netty's own code guards every one of these behind try/catch
# NoClassDefFoundError, so their absence is harmless at runtime — R8 just needs to be
# told not to treat "referenced but absent" as an error for them.
-dontwarn io.netty.internal.tcnative.**
# Same story for epoll/kqueue: excluded at the dependency level (see app/build.gradle.kts)
# since they're native binaries for the wrong OS/ABI to ever load on Android — Ktor's
# NettyApplicationEngine references the classes speculatively and falls back to NIO.
-dontwarn io.netty.channel.epoll.**
-dontwarn io.netty.channel.kqueue.**
-dontwarn org.apache.log4j.**
-dontwarn org.apache.logging.log4j.**
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.eclipse.jetty.npn.**
-dontwarn reactor.blockhound.**
-dontwarn java.lang.management.**
