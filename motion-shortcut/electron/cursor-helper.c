#include <ApplicationServices/ApplicationServices.h>
#include <stdio.h>
#include <string.h>

int main(void) {
  char line[128];
  char command[16];
  double x;
  double y;
  CGEventRef initialEvent = CGEventCreate(NULL);
  CGPoint current = CGPointZero;
  if (initialEvent != NULL) {
    current = CGEventGetLocation(initialEvent);
    CFRelease(initialEvent);
  }

  while (fgets(line, sizeof(line), stdin) != NULL) {
    if (sscanf(line, "%15s %lf %lf", command, &x, &y) == 3 &&
        strcmp(command, "move") == 0) {
      current = CGPointMake(x, y);
      CGEventRef event = CGEventCreateMouseEvent(
          NULL, kCGEventMouseMoved, current, kCGMouseButtonLeft);
      if (event != NULL) {
        CGEventPost(kCGHIDEventTap, event);
        CFRelease(event);
      }
    } else if (sscanf(line, "%15s", command) == 1 &&
               strcmp(command, "click") == 0) {
      CGEventRef down = CGEventCreateMouseEvent(
          NULL, kCGEventLeftMouseDown, current, kCGMouseButtonLeft);
      CGEventRef up = CGEventCreateMouseEvent(
          NULL, kCGEventLeftMouseUp, current, kCGMouseButtonLeft);
      if (down != NULL && up != NULL) {
        CGEventPost(kCGHIDEventTap, down);
        CGEventPost(kCGHIDEventTap, up);
      }
      if (down != NULL) CFRelease(down);
      if (up != NULL) CFRelease(up);
    }
  }
  return 0;
}
