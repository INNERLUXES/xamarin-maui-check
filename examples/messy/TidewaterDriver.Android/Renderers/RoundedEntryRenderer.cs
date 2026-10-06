using Android.Content;
using Android.Graphics.Drawables;
using TidewaterDriver.Controls;
using TidewaterDriver.Droid.Renderers;
using Xamarin.Forms;
using Xamarin.Forms.Platform.Android;

[assembly: ExportRenderer(typeof(RoundedEntry), typeof(RoundedEntryRenderer))]

namespace TidewaterDriver.Droid.Renderers
{
    public class RoundedEntryRenderer : EntryRenderer
    {
        public RoundedEntryRenderer(Context context) : base(context)
        {
        }

        protected override void OnElementChanged(ElementChangedEventArgs<Entry> e)
        {
            base.OnElementChanged(e);
            if (Control == null || !(e.NewElement is RoundedEntry entry))
            {
                return;
            }
            var shape = new GradientDrawable();
            shape.SetCornerRadius((float)entry.CornerRadius);
            shape.SetStroke(2, entry.BorderColor.ToAndroid());
            Control.Background = shape;
        }
    }
}
